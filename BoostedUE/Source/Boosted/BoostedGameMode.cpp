#include "BoostedGameMode.h"
#include "BoostedAI.h"
#include "BoostedCharacter.h"
#include "BoostedCity.h"
#include "BoostedGameInstance.h"
#include "BoostedLocation.h"
#include "BoostedPlayerController.h"
#include "BoostedSettings.h"
#include "BoostedVehicle.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Kismet/GameplayStatics.h"

namespace
{
	const FLinearColor Green(0.24f, 1.f, 0.55f);
	const FLinearColor Red(1.f, 0.18f, 0.33f);
	const FLinearColor Gold(1.f, 0.79f, 0.29f);
	const FLinearColor Blue(0.2f, 0.84f, 1.f);
	const FIntPoint GridDirs[4] = { FIntPoint(1, 0), FIntPoint(-1, 0), FIntPoint(0, 1), FIntPoint(0, -1) };
}

ABoostedGameMode::ABoostedGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	DefaultPawnClass = ABoostedCharacter::StaticClass();
	PlayerControllerClass = ABoostedPlayerController::StaticClass();
}

UBoostedGameInstance* ABoostedGameMode::GetGI() const
{
	return GetGameInstance<UBoostedGameInstance>();
}

ABoostedPlayerController* ABoostedGameMode::GetPC() const
{
	return Cast<ABoostedPlayerController>(UGameplayStatics::GetPlayerController(this, 0));
}

ABoostedCity* ABoostedGameMode::GetCity()
{
	if (!City)
	{
		City = ABoostedCity::Get(GetWorld());
	}
	return City;
}

void ABoostedGameMode::BeginPlay()
{
	Super::BeginPlay();
	GetCity();
}

UClass* ABoostedGameMode::GetDefaultPawnClassForController_Implementation(AController* InController)
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	const UBoostedGameInstance* G = GetGI();
	const int32 Body = G ? G->Look.Body : 0;
	for (const int32 Index : { Body, 0 })
	{
		if (S->Bodies.IsValidIndex(Index) && !S->Bodies[Index].CharacterClass.IsNull())
		{
			if (UClass* Cls = S->Bodies[Index].CharacterClass.LoadSynchronous())
			{
				return Cls;
			}
		}
	}
	return ABoostedCharacter::StaticClass();
}

void ABoostedGameMode::RestartPlayer(AController* NewPlayer)
{
	if (ABoostedCity* C = GetCity())
	{
		RestartPlayerAtTransform(NewPlayer, C->GetPlayerSpawn());
		return;
	}
	Super::RestartPlayer(NewPlayer);
}

void ABoostedGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	UpdateWanted(DeltaSeconds);
	SpawnTimer -= DeltaSeconds;
	if (SpawnTimer <= 0.f)
	{
		SpawnTimer = 0.25f;
		UpdateSpawning();
	}
}

// ---------------------------------------------------------------------- wanted

void ABoostedGameMode::AddWanted(int32 Stars, const FString& Reason)
{
	const int32 Before = WantedLevel;
	WantedLevel = FMath::Clamp(WantedLevel + Stars, 0, 5);
	EvadeTimer = 0.f;
	if (WantedLevel > Before)
	{
		WantedFlash = 2.f;
		if (ABoostedPlayerController* P = GetPC())
		{
			P->Toast(FString::Printf(TEXT("WANTED %d/5 - %s"), WantedLevel, *Reason), Red);
		}
	}
}

void ABoostedGameMode::ClearWanted(bool bReward)
{
	const int32 Level = WantedLevel;
	WantedLevel = 0;
	EvadeTimer = 0.f;
	BustTimer = 0.f;
	bCopsSeePlayer = false;
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It; ++It)
	{
		if (ABoostedAIDriver* D = Cast<ABoostedAIDriver>(It->GetController()))
		{
			if (D->IsPursuing())
			{
				D->StopPursuit();
			}
		}
	}
	if (bReward && Level > 0)
	{
		if (ABoostedPlayerController* P = GetPC())
		{
			P->Toast(TEXT("Lost the cops"), Green);
		}
		AnnounceXP(40 * Level);
	}
}

void ABoostedGameMode::UpdateWanted(float DeltaSeconds)
{
	if (WantedFlash > 0.f)
	{
		WantedFlash -= DeltaSeconds;
	}
	ABoostedPlayerController* P = GetPC();
	APawn* Pawn = P ? P->GetPawn() : nullptr;
	if (!Pawn || WantedLevel == 0 || P->IsMenuOpen())
	{
		if (WantedLevel == 0)
		{
			BustTimer = 0.f;
			bCopsSeePlayer = false;
		}
		return;
	}
	const FVector Loc = Pawn->GetActorLocation();
	const float Sight = 4000.f + WantedLevel * 1200.f;
	bool bSeen = false;
	float Nearest = TNumericLimits<float>::Max();
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It; ++It)
	{
		ABoostedVehicle* V = *It;
		if (!V->bIsPolice || !V->HasAIDriver())
		{
			continue;
		}
		const float D = FVector::Dist2D(V->GetActorLocation(), Loc);
		if (V->bPursuit)
		{
			Nearest = FMath::Min(Nearest, D);
		}
		if (!bSeen && D < Sight)
		{
			FHitResult Hit;
			FCollisionQueryParams Params(SCENE_QUERY_STAT(BoostedWantedSight), false, V);
			Params.AddIgnoredActor(Pawn);
			if (!GetWorld()->LineTraceSingleByChannel(Hit, V->GetActorLocation() + FVector(0, 0, 120), Loc + FVector(0, 0, 80), ECC_Visibility, Params))
			{
				bSeen = true;
			}
		}
	}
	bCopsSeePlayer = bSeen;
	if (bSeen)
	{
		EvadeTimer = 0.f;
	}
	else
	{
		EvadeTimer += DeltaSeconds;
		if (EvadeTimer >= GetEvadeNeeded())
		{
			ClearWanted(true);
			return;
		}
	}
	const ABoostedVehicle* Car = Cast<ABoostedVehicle>(Pawn);
	const float Speed = Car ? FMath::Abs(Car->GetForwardSpeedMS()) : Pawn->GetVelocity().Size() / 100.f;
	const bool bSlow = Car ? Speed < 2.2f : Speed < 3.f;
	const float Close = Car ? 800.f : 500.f;
	if (bSlow && Nearest < Close)
	{
		BustTimer += DeltaSeconds;
	}
	else
	{
		BustTimer = FMath::Max(0.f, BustTimer - DeltaSeconds * 1.5f);
	}
	if (BustTimer > (Car ? 2.6f : 1.4f))
	{
		BustTimer = 0.f;
		Busted();
	}
}

// ---------------------------------------------------------------------- spawning

FName ABoostedGameMode::PickCivilianModel(bool bForParking) const
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	const UBoostedGameInstance* G = GetGI();
	TArray<TPair<FName, float>> Weights;
	float Total = 0.f;
	for (const FBoostedCarModel& M : S->Cars)
	{
		if (M.Rarity <= 0.f)
		{
			continue;
		}
		float W = M.Rarity;
		if (G && G->Contracts.ContainsByPredicate([&M](const FBoostContract& C) { return C.ModelId == M.Id; }))
		{
			W *= bForParking ? 4.f : 2.f; // boost-list targets show up more often
		}
		Weights.Emplace(M.Id, W);
		Total += W;
	}
	float R = FMath::FRand() * Total;
	for (const TPair<FName, float>& W : Weights)
	{
		R -= W.Value;
		if (R <= 0.f)
		{
			return W.Key;
		}
	}
	return Weights.Num() ? Weights.Last().Key : FName(TEXT("camri"));
}

FCarUpgrades ABoostedGameMode::FactoryUpgrades(FName ModelId) const
{
	FCarUpgrades U;
	if (const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(ModelId))
	{
		if (M->FactoryColors.Num() > 0)
		{
			U.Paint = M->FactoryColors[FMath::RandRange(0, M->FactoryColors.Num() - 1)];
		}
	}
	U.Finish = FMath::FRand() < 0.4f ? EPaintFinish::Metallic : EPaintFinish::Gloss;
	U.Tint = FMath::RandRange(0, 2);
	U.Plate = BoostedEconomy::RandomPlate();
	return U;
}

void ABoostedGameMode::WarnNoVehicleClass()
{
	if (bWarnedNoVehicle)
	{
		return;
	}
	bWarnedNoVehicle = true;
	UE_LOG(LogBoosted, Warning, TEXT("No car Blueprint found. Add the Vehicle template or set Project Settings > Game > Boosted > Default Vehicle Class."));
	if (GEngine)
	{
		GEngine->AddOnScreenDebugMessage(-1, 20.f, FColor::Orange, TEXT("BOOSTED: no car found. Add the Vehicle template (Add > Add Feature or Content Pack > Vehicle) or set Project Settings > Game > Boosted > Default Vehicle Class (see Docs/SETUP.md)"));
	}
}

ABoostedVehicle* ABoostedGameMode::SpawnCar(FName ModelId, const FTransform& Transform, EVehicleRole InRole, const FCarUpgrades* Upgrades, float Health)
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	const bool bPolice = InRole == EVehicleRole::Police || ModelId == TEXT("interceptor");
	UClass* Cls = bPolice ? S->ResolvePoliceClass() : S->ResolveVehicleClass(ModelId);
	if (!Cls)
	{
		WarnNoVehicleClass();
		return nullptr;
	}
	// BoostedVehicle Blueprints spawn as they are; any other vehicle Blueprint lends its body to a plain BoostedVehicle
	const bool bBoostedClass = Cls->IsChildOf(ABoostedVehicle::StaticClass());
	ABoostedVehicle* V = GetWorld()->SpawnActorDeferred<ABoostedVehicle>(bBoostedClass ? Cls : ABoostedVehicle::StaticClass(), Transform, nullptr, nullptr, ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButDontSpawnIfColliding);
	if (!V)
	{
		return nullptr;
	}
	if (!bBoostedClass)
	{
		V->CopyBodyFrom(Cls);
	}
	V->ModelId = ModelId;
	V->VehicleRole = InRole;
	V->bIsPolice = bPolice;
	V->bLocked = InRole != EVehicleRole::Abandoned;
	V->Health = Health;
	V->Upgrades = Upgrades ? *Upgrades : FactoryUpgrades(ModelId);
	if (bPolice && !Upgrades)
	{
		V->Upgrades.Paint = FLinearColor(0.01f, 0.01f, 0.012f);
		V->Upgrades.Finish = EPaintFinish::Gloss;
	}
	V->AutoPossessAI = EAutoPossessAI::Disabled;
	V->AIControllerClass = ABoostedAIDriver::StaticClass();
	V->FinishSpawning(Transform);
	return IsValid(V) ? V : nullptr;
}

void ABoostedGameMode::SpawnTraffic(const FVector& Around, bool bPolice, bool bPursuit)
{
	ABoostedCity* C = GetCity();
	if (!C)
	{
		return;
	}
	for (int32 Try = 0; Try < 8; ++Try)
	{
		const FIntPoint A(FMath::RandRange(0, ABoostedCity::N), FMath::RandRange(0, ABoostedCity::N));
		const FIntPoint D = GridDirs[FMath::RandRange(0, 3)];
		const FIntPoint B = A + D;
		if (!C->IsValidNode(B.X, B.Y))
		{
			continue;
		}
		const float T = FMath::FRandRange(0.25f, 0.75f);
		const FVector PA = C->NodeLocation(A.X, A.Y), PB = C->NodeLocation(B.X, B.Y);
		const FVector Loc = PA + (PB - PA) * T + FVector(-D.Y, D.X, 0.f) * ABoostedCity::Lane + FVector(0.f, 0.f, 70.f);
		const float Dist = FVector::Dist2D(Loc, Around);
		if (Dist < 7000.f || Dist > 20000.f)
		{
			continue;
		}
		bool bBlocked = false;
		for (TActorIterator<ABoostedVehicle> It(GetWorld()); It && !bBlocked; ++It)
		{
			bBlocked = FVector::Dist2D(It->GetActorLocation(), Loc) < 1200.f;
		}
		if (bBlocked)
		{
			continue;
		}
		const FName Model = bPolice ? FName(TEXT("interceptor")) : PickCivilianModel(false);
		const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(static_cast<float>(D.Y), static_cast<float>(D.X)));
		ABoostedVehicle* V = SpawnCar(Model, FTransform(FRotator(0.f, Yaw, 0.f), Loc), bPolice ? EVehicleRole::Police : EVehicleRole::Traffic);
		if (!V)
		{
			return;
		}
		V->SpawnDefaultController();
		if (ABoostedAIDriver* Driver = Cast<ABoostedAIDriver>(V->GetController()))
		{
			Driver->StartCruise(A, B);
			if (bPursuit)
			{
				Driver->StartPursuit();
			}
		}
		Traffic.Add(V);
		return;
	}
}

ABoostedCharacter* ABoostedGameMode::SpawnPedestrian(const FVector& Location, const FRotator& Rotation)
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	UClass* Cls = ABoostedCharacter::StaticClass();
	if (S->PedestrianClasses.Num() > 0)
	{
		const TSoftClassPtr<ABoostedCharacter>& Pick = S->PedestrianClasses[FMath::RandRange(0, S->PedestrianClasses.Num() - 1)];
		if (UClass* Loaded = Pick.IsNull() ? nullptr : Pick.LoadSynchronous())
		{
			Cls = Loaded;
		}
	}
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
	ABoostedCharacter* Ped = GetWorld()->SpawnActor<ABoostedCharacter>(Cls, Location + FVector(0.f, 0.f, 100.f), Rotation, P);
	if (!Ped)
	{
		return nullptr;
	}
	// cars drive into people instead of stopping dead on them (hits are handled by the ped AI)
	Ped->GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Vehicle, ECR_Overlap);
	Ped->GetMesh()->SetCollisionResponseToChannel(ECC_Vehicle, ECR_Ignore);
	Ped->AIControllerClass = ABoostedPedController::StaticClass();
	Ped->SpawnDefaultController();
	// random fit from the wardrobe
	FCharacterLook Look;
	Look.Top = FMath::RandRange(0, FMath::Max(0, S->Tops.Num() - 1));
	Look.Bottom = FMath::RandRange(0, FMath::Max(0, S->Bottoms.Num() - 1));
	Look.Shoes = FMath::RandRange(0, FMath::Max(0, S->Shoes.Num() - 1));
	Look.Headwear = FMath::FRand() < 0.5f ? 0 : FMath::RandRange(0, FMath::Max(0, S->Headwear.Num() - 1));
	Look.Chain = FMath::FRand() < 0.6f ? -1 : FMath::RandRange(0, FMath::Max(0, S->Chains.Num() - 1));
	const int32 Colors = FMath::Max(1, S->ClothingColors.Num());
	Look.TopColor = FMath::RandRange(0, Colors - 1);
	Look.BottomColor = FMath::RandRange(0, Colors - 1);
	Look.ShoesColor = FMath::RandRange(0, Colors - 1);
	Look.HeadwearColor = FMath::RandRange(0, Colors - 1);
	Ped->ApplyLook(Look);
	return Ped;
}

void ABoostedGameMode::SpawnWalker(const FVector& Around)
{
	ABoostedCity* C = GetCity();
	const TArray<FCityBlock>& Blocks = C->GetBlocks();
	TArray<int32> Candidates;
	for (int32 i = 0; i < Blocks.Num(); ++i)
	{
		const FVector Center = C->GetActorTransform().TransformPosition(FVector(Blocks[i].Center(), 0.f));
		const float D = FVector::Dist2D(Center, Around);
		if (D > 3500.f && D < 9500.f && Blocks[i].Type != 'E' && Blocks[i].Type != 'I')
		{
			Candidates.Add(i);
		}
	}
	if (Candidates.Num() == 0)
	{
		return;
	}
	const TArray<FVector> Loop = C->SidewalkLoop(Candidates[FMath::RandRange(0, Candidates.Num() - 1)]);
	const int32 K = FMath::RandRange(0, 3);
	const FVector Start = FMath::Lerp(Loop[K], Loop[(K + 1) % 4], FMath::FRand());
	if (ABoostedCharacter* Ped = SpawnPedestrian(Start, FRotator::ZeroRotator))
	{
		const bool bClockwise = FMath::RandBool();
		if (ABoostedPedController* AI = Cast<ABoostedPedController>(Ped->GetController()))
		{
			AI->SetLoop(Loop, bClockwise ? (K + 1) % 4 : K, bClockwise);
		}
		Walkers.Add(Ped);
	}
}

void ABoostedGameMode::UpdateSpawning()
{
	ABoostedPlayerController* P = GetPC();
	APawn* Pawn = P ? P->GetPawn() : nullptr;
	ABoostedCity* C = GetCity();
	if (!Pawn || !C)
	{
		return;
	}
	const UBoostedSettings* S = UBoostedSettings::Get();
	UBoostedGameInstance* G = GetGI();
	const FVector Here = Pawn->GetActorLocation();
	const float Now = GetWorld()->GetTimeSeconds();

	// parked cars on every parking spot near the player
	const TArray<FParkingSpot>& Spots = C->GetParkingSpots();
	if (SpotCars.Num() != Spots.Num())
	{
		SpotCars.SetNum(Spots.Num());
		SpotNext.Init(0.f, Spots.Num());
	}
	int32 Spawned = 0;
	for (int32 i = 0; i < Spots.Num(); ++i)
	{
		ABoostedVehicle* Car = SpotCars[i].Get();
		if (Car && Car->VehicleRole != EVehicleRole::Parked)
		{
			SpotCars[i] = nullptr; // stolen: leave the spot empty for a while
			SpotNext[i] = Now + 90.f;
			Car = nullptr;
		}
		const float D = FVector::Dist2D(Spots[i].Location, Here);
		if (!Car && D < S->ParkedCarRadius && D > 2500.f && Now >= SpotNext[i] && Spawned < 3)
		{
			if (FMath::FRand() < (Spots[i].bPolice ? 0.6f : 0.5f))
			{
				const FName Model = Spots[i].bPolice ? FName(TEXT("interceptor")) : PickCivilianModel(true);
				ABoostedVehicle* V = SpawnCar(Model, FTransform(FRotator(0.f, Spots[i].Yaw, 0.f), Spots[i].Location), EVehicleRole::Parked, nullptr, FMath::FRandRange(0.75f, 1.f));
				if (V)
				{
					V->SpotIndex = i;
					SpotCars[i] = V;
					++Spawned;
				}
			}
			else
			{
				SpotNext[i] = Now + 60.f;
			}
		}
		else if (Car && D > S->ParkedCarRadius + 3000.f)
		{
			Car->Destroy();
			SpotCars[i] = nullptr;
			SpotNext[i] = Now + 5.f;
		}
	}

	// traffic + patrol cops
	Traffic.RemoveAll([](const TWeakObjectPtr<ABoostedVehicle>& W)
	{
		return !W.IsValid() || !W->HasAIDriver();
	});
	for (int32 i = Traffic.Num() - 1; i >= 0; --i)
	{
		ABoostedVehicle* V = Traffic[i].Get();
		if (FVector::Dist2D(V->GetActorLocation(), Here) > 23000.f && !V->bPursuit)
		{
			V->Destroy();
			Traffic.RemoveAt(i);
		}
	}
	if (Traffic.Num() < S->TrafficCars)
	{
		SpawnTraffic(Here, FMath::FRand() < 0.07f, false);
	}

	// police pursuit strength follows the wanted level
	if (WantedLevel > 0)
	{
		const int32 Want = FMath::Min(7, 1 + WantedLevel + (WantedLevel >= 4 ? 1 : 0));
		int32 Pursuing = 0;
		ABoostedAIDriver* Recruit = nullptr;
		for (const TWeakObjectPtr<ABoostedVehicle>& W : Traffic)
		{
			if (!W.IsValid() || !W->bIsPolice)
			{
				continue;
			}
			ABoostedAIDriver* D = Cast<ABoostedAIDriver>(W->GetController());
			if (D && D->IsPursuing())
			{
				++Pursuing;
			}
			else if (D && !Recruit && FVector::Dist2D(W->GetActorLocation(), Here) < 15000.f)
			{
				Recruit = D;
			}
		}
		if (Pursuing < Want)
		{
			if (Recruit)
			{
				Recruit->StartPursuit();
			}
			else
			{
				SpawnTraffic(Here, true, true);
			}
		}
	}

	// cars left behind
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It; ++It)
	{
		ABoostedVehicle* V = *It;
		if (V->VehicleRole == EVehicleRole::Abandoned && FVector::Dist2D(V->GetActorLocation(), Here) > 30000.f)
		{
			if (V->bOwned && G)
			{
				FStoredCar Stored;
				Stored.ModelId = V->ModelId;
				Stored.Upgrades = V->Upgrades;
				Stored.Health = V->Health;
				Stored.bHot = V->bHot;
				G->Garage.Add(Stored);
				G->SaveProfile();
				P->Toast(FString::Printf(TEXT("Your %s was towed back to The Spot"), *V->GetDisplayName()), Blue);
			}
			V->Destroy();
		}
	}

	// pedestrians
	Walkers.RemoveAll([](const TWeakObjectPtr<ABoostedCharacter>& W) { return !W.IsValid(); });
	for (int32 i = Walkers.Num() - 1; i >= 0; --i)
	{
		ABoostedCharacter* W = Walkers[i].Get();
		if (FVector::Dist2D(W->GetActorLocation(), Here) > 11000.f && !W->IsKnockedDown())
		{
			W->Destroy();
			Walkers.RemoveAt(i);
		}
	}
	if (Walkers.Num() < S->Pedestrians)
	{
		SpawnWalker(Here);
	}
}

// ---------------------------------------------------------------------- events

void ABoostedGameMode::AnnounceXP(int32 Amount)
{
	UBoostedGameInstance* G = GetGI();
	if (G && G->AddXP(Amount))
	{
		if (ABoostedPlayerController* P = GetPC())
		{
			P->Toast(FString::Printf(TEXT("Street Cred LV %d - new upgrades unlocked"), G->GetCredLevel()), Gold);
		}
	}
}

void ABoostedGameMode::OnBreakIn(ABoostedVehicle* V)
{
	if (!V)
	{
		return;
	}
	if (V->bIsPolice)
	{
		V->TriggerAlarm(6.f);
		AddWanted(3, TEXT("Stole a police cruiser"));
		return;
	}
	if (FMath::FRand() < 0.35f)
	{
		V->TriggerAlarm(5.f);
		bool bCopNear = false;
		for (TActorIterator<ABoostedVehicle> It(GetWorld()); It && !bCopNear; ++It)
		{
			bCopNear = It->bIsPolice && It->HasAIDriver() && FVector::Dist2D(It->GetActorLocation(), V->GetActorLocation()) < 9000.f;
		}
		if (bCopNear || FMath::FRand() < 0.5f)
		{
			AddWanted(1, TEXT("Car alarm - somebody called it in"));
		}
		else if (ABoostedPlayerController* P = GetPC())
		{
			P->Toast(TEXT("Alarm! Get out of here"), Gold);
		}
	}
}

void ABoostedGameMode::OnCarjack(ABoostedVehicle* V)
{
	if (!V)
	{
		return;
	}
	if (ABoostedCharacter* Ped = SpawnPedestrian(V->GetDoorLocation(), V->GetActorRotation()))
	{
		if (ABoostedPedController* AI = Cast<ABoostedPedController>(Ped->GetController()))
		{
			AI->Flee(V->GetActorLocation(), 10.f);
		}
		Walkers.Add(Ped);
	}
	AddWanted(V->bIsPolice ? 3 : 1, V->bIsPolice ? TEXT("Jacked a cop") : TEXT("Carjacking"));
	AnnounceXP(10);
}

void ABoostedGameMode::OnPlayerStoleVehicle(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GetGI();
	if (!G || !V)
	{
		return;
	}
	G->Stats.Stolen++;
	if (G->Tutorial == 0)
	{
		G->Tutorial = 1;
	}
	if (const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(V->ModelId))
	{
		if (M->Value >= 30000)
		{
			if (ABoostedPlayerController* P = GetPC())
			{
				P->Toast(FString::Printf(TEXT("Big score: %s"), *M->GetDisplayName()), Gold);
			}
		}
	}
}

void ABoostedGameMode::OnVehicleImpact(ABoostedVehicle* V, AActor* Other, float ImpactMS)
{
	ABoostedPlayerController* P = GetPC();
	if (!P || P->GetPawn() != V)
	{
		return;
	}
	ABoostedVehicle* OtherCar = Cast<ABoostedVehicle>(Other);
	if (!OtherCar)
	{
		return;
	}
	const float Now = GetWorld()->GetTimeSeconds();
	if (OtherCar->bIsPolice && OtherCar->HasAIDriver() && ImpactMS > 5.f && Now - LastRamTime > 4.f)
	{
		LastRamTime = Now;
		if (WantedLevel < 5)
		{
			AddWanted(WantedLevel == 0 ? 2 : 1, TEXT("Rammed a cop car"));
		}
	}
	else if (ABoostedAIDriver* D = Cast<ABoostedAIDriver>(OtherCar->GetController()))
	{
		D->Panic(6.f);
	}
	else if (OtherCar->VehicleRole == EVehicleRole::Parked && ImpactMS > 8.f && FMath::FRand() < 0.5f)
	{
		OtherCar->TriggerAlarm(4.f);
	}
}

void ABoostedGameMode::OnPedestrianHit(ABoostedCharacter* Ped, ABoostedVehicle* By)
{
	ABoostedPlayerController* P = GetPC();
	if (!P || P->GetPawn() != By)
	{
		return;
	}
	bool bWitness = false;
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It && !bWitness; ++It)
	{
		bWitness = It->bIsPolice && It->HasAIDriver() && FVector::Dist2D(It->GetActorLocation(), By->GetActorLocation()) < 7000.f;
	}
	if (bWitness || FMath::FRand() < 0.35f)
	{
		AddWanted(1, TEXT("Hit-and-run"));
	}
}

void ABoostedGameMode::OnHorn(ABoostedVehicle* V)
{
	for (const TWeakObjectPtr<ABoostedCharacter>& W : Walkers)
	{
		if (W.IsValid() && FVector::Dist2D(W->GetActorLocation(), V->GetActorLocation()) < 1500.f)
		{
			if (ABoostedPedController* AI = Cast<ABoostedPedController>(W->GetController()))
			{
				AI->Flee(V->GetActorLocation(), 3.f);
			}
		}
	}
}

// ---------------------------------------------------------------------- money

void ABoostedGameMode::PlacePlayerAt(EBoostedLocationType Type)
{
	ABoostedPlayerController* P = GetPC();
	ABoostedCharacter* Char = P ? P->GetOnFootCharacter() : nullptr;
	ABoostedLocation* Loc = GetCity() ? GetCity()->FindLocation(Type) : nullptr;
	if (Char && Loc)
	{
		const FVector Spot = Loc->GetActorLocation() + Loc->GetActorForwardVector() * 300.f + FVector(0.f, 0.f, 110.f);
		Char->TeleportTo(Spot, FRotator(0.f, Loc->GetActorRotation().Yaw, 0.f));
	}
}

void ABoostedGameMode::ChopVehicle(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	if (!V || !G || !P)
	{
		return;
	}
	const int32 Price = UBoostedGameInstance::ChopPrice(V->ModelId, V->Upgrades, V->Health);
	if (P->GetPawn() == V)
	{
		P->ExitVehicle(true);
	}
	V->Destroy();
	G->Cash += Price;
	G->Stats.Chopped++;
	if (G->Tutorial == 1)
	{
		G->Tutorial = 2;
	}
	AnnounceXP(100);
	G->SaveProfile();
	P->Banner(TEXT("Chopped"), FString::Printf(TEXT("+%s"), *BoostedEconomy::Money(Price)), Green);
}

void ABoostedGameMode::ExportVehicle(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	if (!V || !G || !P)
	{
		return;
	}
	const int32 Contract = G->FindBestContract(V->ModelId, V->Upgrades);
	const int32 Offer = UBoostedGameInstance::ExportPrice(V->ModelId, V->Upgrades, V->Health, V->bHot);
	const int32 Pay = Contract != INDEX_NONE ? FMath::Max(G->Contracts[Contract].Reward, Offer) : Offer;
	if (P->GetPawn() == V)
	{
		P->ExitVehicle(true);
	}
	V->Destroy();
	G->Cash += Pay;
	G->Stats.Exported++;
	if (Contract != INDEX_NONE)
	{
		G->CompleteContract(Contract);
		G->Stats.Contracts++;
		AnnounceXP(450);
	}
	else
	{
		AnnounceXP(160);
	}
	G->Tutorial = FMath::Max(G->Tutorial, 3);
	G->SaveProfile();
	P->Banner(Contract != INDEX_NONE ? TEXT("Contract done") : TEXT("Shipped"), FString::Printf(TEXT("+%s"), *BoostedEconomy::Money(Pay)), Green);
}

bool ABoostedGameMode::ResprayVehicle(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	if (!V || !G || !P)
	{
		return false;
	}
	const int32 Cost = BoostedEconomy::VinSwapCost + UBoostedGameInstance::RepairCost(V->ModelId, V->Health);
	if (!G->CanAfford(Cost))
	{
		P->Toast(TEXT("Not enough cash"), Red);
		return false;
	}
	if (WantedLevel > 0 && bCopsSeePlayer)
	{
		P->Toast(TEXT("The cops saw you pull in - lose them first"), Red);
		return false;
	}
	G->Cash -= Cost;
	V->Repair();
	V->bHot = false;
	FCarUpgrades U = V->Upgrades;
	U.Plate = BoostedEconomy::RandomPlate();
	V->ApplyUpgrades(U);
	const bool bHadHeat = WantedLevel > 0;
	ClearWanted(false);
	G->SaveProfile();
	P->Banner(TEXT("Fresh Coat"), bHadHeat ? TEXT("Heat cleared - new plates, new VIN") : TEXT("New plates, new VIN"), FLinearColor(1.f, 0.33f, 0.78f));
	return true;
}

bool ABoostedGameMode::StoreVehicle(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	if (!V || !G || !P)
	{
		return false;
	}
	if (G->Garage.Num() >= BoostedEconomy::GarageSlots)
	{
		P->Toast(TEXT("Garage is full"), Red);
		return false;
	}
	FStoredCar Stored;
	Stored.ModelId = V->ModelId;
	Stored.Upgrades = V->Upgrades;
	Stored.Health = V->Health;
	Stored.bHot = V->bHot;
	G->Garage.Add(Stored);
	if (P->GetPawn() == V)
	{
		P->ExitVehicle(true);
	}
	V->Destroy();
	if (G->Tutorial == 1)
	{
		G->Tutorial = 2;
	}
	AnnounceXP(50);
	G->SaveProfile();
	P->Toast(TEXT("Stored at The Spot"), Green);
	return true;
}

void ABoostedGameMode::TakeOutCar(int32 GarageIndex)
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	ABoostedLocation* Loc = GetCity() ? GetCity()->FindLocation(EBoostedLocationType::Garage) : nullptr;
	if (!G || !P || !Loc || !G->Garage.IsValidIndex(GarageIndex))
	{
		return;
	}
	const FStoredCar Entry = G->Garage[GarageIndex];
	G->Garage.RemoveAt(GarageIndex);
	if (ABoostedVehicle* Current = P->GetVehicle())
	{
		// swap: the car you're in takes the empty slot
		FStoredCar Old;
		Old.ModelId = Current->ModelId;
		Old.Upgrades = Current->Upgrades;
		Old.Health = Current->Health;
		Old.bHot = Current->bHot;
		G->Garage.Insert(Old, GarageIndex);
		P->ExitVehicle(true);
		Current->Destroy();
	}
	const FTransform T(Loc->GetActorRotation(), Loc->GetActorLocation() + FVector(0.f, 0.f, 70.f));
	ABoostedVehicle* V = SpawnCar(Entry.ModelId, T, EVehicleRole::Abandoned, &Entry.Upgrades, Entry.Health);
	if (!V)
	{
		G->Garage.Insert(Entry, FMath::Min(GarageIndex, G->Garage.Num()));
		return;
	}
	V->bOwned = true;
	V->bStolen = true;
	V->bHot = Entry.bHot;
	V->bLocked = false;
	P->EnterVehicle(V, false);
	G->SaveProfile();
}

void ABoostedGameMode::Busted()
{
	UBoostedGameInstance* G = GetGI();
	ABoostedPlayerController* P = GetPC();
	if (!G || !P)
	{
		return;
	}
	const int32 Fine = FMath::Min(G->Cash, FMath::Max(500, FMath::RoundToInt(G->Cash * 0.1f)));
	G->Cash -= Fine;
	FString Lost;
	if (ABoostedVehicle* V = P->GetVehicle())
	{
		Lost = V->GetDisplayName() + (V->bOwned ? TEXT(" (yours - impounded)") : TEXT(""));
		P->ExitVehicle(true);
		V->Destroy();
	}
	PlacePlayerAt(EBoostedLocationType::PoliceStation);
	ClearWanted(false);
	G->SaveProfile();
	P->ShowBusted(Fine, Lost);
}

void ABoostedGameMode::RespawnPlayerBody()
{
	ABoostedPlayerController* P = GetPC();
	UBoostedGameInstance* G = GetGI();
	ABoostedCharacter* Old = P ? P->GetOnFootCharacter() : nullptr;
	if (!Old || !G)
	{
		return;
	}
	UClass* Wanted = GetDefaultPawnClassForController(P);
	if (Wanted && Old->GetClass() != Wanted)
	{
		FActorSpawnParameters Params;
		Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
		ABoostedCharacter* New = GetWorld()->SpawnActor<ABoostedCharacter>(Wanted, Old->GetActorTransform(), Params);
		if (New)
		{
			const bool bWasPossessed = P->GetPawn() == Old;
			P->SetOnFootCharacter(New);
			if (bWasPossessed)
			{
				P->Possess(New);
			}
			Old->Destroy();
		}
	}
	if (ABoostedCharacter* Char = P->GetOnFootCharacter())
	{
		Char->ApplyLook(G->Look);
	}
}
