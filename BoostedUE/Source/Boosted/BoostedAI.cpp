#include "BoostedAI.h"
#include "BoostedCharacter.h"
#include "BoostedCity.h"
#include "BoostedGameMode.h"
#include "BoostedVehicle.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "EngineUtils.h"

namespace
{
	FVector Flat(FVector V)
	{
		V.Z = 0.f;
		return V;
	}

	/** Right-hand side of a grid direction (Unreal: X forward, Y right). */
	FVector RightOf(const FIntPoint& D)
	{
		return FVector(-D.Y, D.X, 0.f);
	}
}

// ====================================================================== drivers

ABoostedAIDriver::ABoostedAIDriver()
{
	PrimaryActorTick.bCanEverTick = true;
}

ABoostedVehicle* ABoostedAIDriver::Car() const
{
	return Cast<ABoostedVehicle>(GetPawn());
}

void ABoostedAIDriver::StartCruise(const FIntPoint& InFrom, const FIntPoint& InTo)
{
	City = ABoostedCity::Get(GetWorld());
	bPursuit = false;
	From = InFrom;
	To = InTo;
	Dir = FIntPoint(FMath::Clamp(To.X - From.X, -1, 1), FMath::Clamp(To.Y - From.Y, -1, 1));
	PlanTurn();
}

void ABoostedAIDriver::StartPursuit()
{
	City = ABoostedCity::Get(GetWorld());
	bPursuit = true;
	RouteUntil = 0.f;
	if (ABoostedVehicle* V = Car())
	{
		V->bSirenOn = true;
		V->bPursuit = true;
	}
}

void ABoostedAIDriver::StopPursuit()
{
	bPursuit = false;
	if (ABoostedVehicle* V = Car())
	{
		V->bSirenOn = false;
		V->bPursuit = false;
		if (City.IsValid())
		{
			// rejoin traffic from the nearest intersection
			const FIntPoint Node = City->NearestNode(V->GetActorLocation());
			const FIntPoint Dirs[4] = { FIntPoint(1, 0), FIntPoint(-1, 0), FIntPoint(0, 1), FIntPoint(0, -1) };
			for (const FIntPoint& D : Dirs)
			{
				if (City->IsValidNode(Node.X + D.X, Node.Y + D.Y))
				{
					StartCruise(Node, Node + D);
					break;
				}
			}
		}
	}
}

void ABoostedAIDriver::PlanTurn()
{
	ABoostedCity* C = City.Get();
	if (!C)
	{
		return;
	}
	// pick the next direction at node To: straight is likeliest, never a U-turn unless forced
	const FIntPoint Dirs[4] = { FIntPoint(1, 0), FIntPoint(-1, 0), FIntPoint(0, 1), FIntPoint(0, -1) };
	TArray<FIntPoint> Options;
	for (const FIntPoint& D : Dirs)
	{
		if (D == FIntPoint(-Dir.X, -Dir.Y))
		{
			continue;
		}
		if (C->IsValidNode(To.X + D.X, To.Y + D.Y))
		{
			Options.Add(D);
		}
	}
	FIntPoint ND(-Dir.X, -Dir.Y);
	if (Options.Num() > 0)
	{
		ND = Options[FMath::RandRange(0, Options.Num() - 1)];
		if (Options.Contains(Dir) && FMath::FRand() < 0.55f)
		{
			ND = Dir;
		}
	}
	const FVector Node = C->NodeLocation(To.X, To.Y);
	const float H = ABoostedCity::RoadWidth * 0.5f + 200.f;
	const float L = ABoostedCity::Lane;
	const FVector D1(Dir.X, Dir.Y, 0.f), D2(ND.X, ND.Y, 0.f);
	const FVector Entry = Node + RightOf(Dir) * L - D1 * H;
	const FVector Exit = Node + RightOf(ND) * L + D2 * H;
	Waypoints.Reset();
	Waypoints.Add(Entry);
	bTurning = ND != Dir;
	if (bTurning)
	{
		const FVector Corner = Node + RightOf(Dir) * L + RightOf(ND) * L;
		Waypoints.Add(((Entry + Exit) * 0.5f + Corner) * 0.5f);
	}
	Waypoints.Add(Exit);
	WaypointIndex = 0;
	NextTo = FIntPoint(To.X + ND.X, To.Y + ND.Y);
	NextDir = ND;
}

float ABoostedAIDriver::ObstacleAhead(float Range) const
{
	const ABoostedVehicle* V = Car();
	if (!V)
	{
		return Range;
	}
	const FVector Fwd = V->GetActorForwardVector();
	const FVector Start = V->GetActorLocation() + Fwd * (V->GetHalfLength() + 60.f) + FVector(0.f, 0.f, 60.f);
	const FVector End = Start + Fwd * Range;
	FCollisionObjectQueryParams Objects;
	Objects.AddObjectTypesToQuery(ECC_Vehicle);
	Objects.AddObjectTypesToQuery(ECC_Pawn);
	Objects.AddObjectTypesToQuery(ECC_PhysicsBody);
	FCollisionQueryParams Params(SCENE_QUERY_STAT(BoostedObstacle), false, V);
	FHitResult Hit;
	if (GetWorld()->SweepSingleByObjectType(Hit, Start, End, FQuat::Identity, Objects, FCollisionShape::MakeSphere(140.f), Params))
	{
		return Hit.Distance;
	}
	return Range;
}

void ABoostedAIDriver::SteerTo(const FVector& Target, float WantSpeed, bool bHandbrake)
{
	ABoostedVehicle* V = Car();
	if (!V)
	{
		return;
	}
	const FVector ToTarget = Flat(Target - V->GetActorLocation());
	const float DesiredYaw = ToTarget.Rotation().Yaw;
	const float Err = FMath::FindDeltaAngleDegrees(V->GetActorRotation().Yaw, DesiredYaw);
	const float Steer = FMath::Clamp(Err / 28.f, -1.f, 1.f);
	const float Speed = V->GetForwardSpeedMS();
	float Throttle = 0.f, Brake = 0.f;
	if (Speed < WantSpeed - 0.5f)
	{
		Throttle = FMath::Clamp((WantSpeed - Speed) / 4.f, 0.25f, 1.f);
	}
	else if (Speed > WantSpeed + 1.f)
	{
		Brake = FMath::Clamp((Speed - WantSpeed) / 5.f, 0.2f, 1.f);
	}
	else
	{
		Throttle = 0.15f;
	}
	V->SetDriveInputs(Throttle, Brake, Steer, bHandbrake);
}

void ABoostedAIDriver::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	ABoostedVehicle* V = Car();
	if (!V || !City.IsValid())
	{
		return;
	}
	if (V->IsWrecked())
	{
		V->SetDriveInputs(0.f, 1.f, 0.f, true);
		return;
	}
	if (bPursuit)
	{
		DrivePursuit(DeltaSeconds);
	}
	else
	{
		DriveCruise(DeltaSeconds);
	}
}

void ABoostedAIDriver::DriveCruise(float DeltaSeconds)
{
	ABoostedVehicle* V = Car();
	if (Waypoints.Num() == 0)
	{
		return;
	}
	FVector Target = Waypoints[WaypointIndex];
	if (FVector::Dist2D(Target, V->GetActorLocation()) < 450.f)
	{
		++WaypointIndex;
		if (WaypointIndex >= Waypoints.Num())
		{
			From = To;
			To = NextTo;
			Dir = NextDir;
			PlanTurn();
		}
		Target = Waypoints[FMath::Min(WaypointIndex, Waypoints.Num() - 1)];
	}
	float Want = CruiseSpeed;
	const float Err = FMath::Abs(FMath::FindDeltaAngleDegrees(V->GetActorRotation().Yaw, Flat(Target - V->GetActorLocation()).Rotation().Yaw));
	if (Err > 18.f)
	{
		Want *= 0.55f;
	}
	if (bTurning && WaypointIndex == 0 && FVector::Dist2D(Target, V->GetActorLocation()) < 1800.f)
	{
		Want = FMath::Min(Want, 6.5f);
	}
	const float Block = ObstacleAhead(1500.f) / 100.f;
	if (Block < 15.f)
	{
		Want = FMath::Min(Want, FMath::Max(0.f, (Block - 4.f) * 1.3f));
	}
	if (PanicTime > 0.f)
	{
		PanicTime -= DeltaSeconds;
		Want *= 1.6f;
	}
	SteerTo(Target, Want);
}

void ABoostedAIDriver::DrivePursuit(float DeltaSeconds)
{
	ABoostedVehicle* V = Car();
	APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0);
	if (!Player)
	{
		return;
	}
	const FVector Me = V->GetActorLocation();
	const FVector PlayerLoc = Player->GetActorLocation();
	const float Dist = FVector::Dist2D(Me, PlayerLoc);

	// reverse out when stuck against something
	if (ReverseTime > 0.f)
	{
		ReverseTime -= DeltaSeconds;
		const float Err = FMath::FindDeltaAngleDegrees(V->GetActorRotation().Yaw, Flat(PlayerLoc - Me).Rotation().Yaw);
		V->SetDriveInputs(0.f, 1.f, FMath::Clamp(-Err / 30.f, -1.f, 1.f), false);
		return;
	}
	if (FMath::Abs(V->GetForwardSpeedMS()) < 1.2f && Dist > 900.f)
	{
		StuckTime += DeltaSeconds;
	}
	else
	{
		StuckTime = FMath::Max(0.f, StuckTime - DeltaSeconds);
	}
	if (StuckTime > 1.6f)
	{
		StuckTime = 0.f;
		ReverseTime = 1.1f;
		return;
	}

	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(BoostedCopSight), false, V);
	Params.AddIgnoredActor(Player);
	const bool bLOS = Dist < 6000.f && !GetWorld()->LineTraceSingleByChannel(Hit, Me + FVector(0, 0, 120), PlayerLoc + FVector(0, 0, 80), ECC_Visibility, Params);

	FVector Target;
	if (bLOS)
	{
		// lead the target a little
		Target = PlayerLoc + Player->GetVelocity() * 0.5f;
	}
	else
	{
		// follow the road grid one intersection at a time toward the player
		const float Now = GetWorld()->GetTimeSeconds();
		if (Now > RouteUntil || FVector::Dist2D(RouteTarget, Me) < 700.f)
		{
			const FIntPoint Here = City->NearestNode(Me);
			const FIntPoint There = City->NearestNode(PlayerLoc);
			FIntPoint NextNode = Here;
			const bool bAtNode = FVector::Dist2D(City->NodeLocation(Here.X, Here.Y), Me) < 900.f;
			if (bAtNode || Here == There)
			{
				const int32 DI = FMath::Sign(There.X - Here.X), DJ = FMath::Sign(There.Y - Here.Y);
				if (FMath::Abs(There.X - Here.X) >= FMath::Abs(There.Y - Here.Y) && DI != 0)
				{
					NextNode.X += DI;
				}
				else if (DJ != 0)
				{
					NextNode.Y += DJ;
				}
			}
			RouteTarget = City->NodeLocation(NextNode.X, NextNode.Y);
			RouteUntil = Now + 3.f;
		}
		Target = RouteTarget;
	}

	const float Err = FMath::Abs(FMath::FindDeltaAngleDegrees(V->GetActorRotation().Yaw, Flat(Target - Me).Rotation().Yaw));
	const APawn* PlayerPawn = Player;
	const float PlayerSpeed = PlayerPawn->GetVelocity().Size() / 100.f;
	float Want = Err > 60.f ? 9.f : (bLOS ? 38.f : 30.f);
	if (Dist < 1000.f && PlayerSpeed < 3.f)
	{
		Want = 3.f; // box the player in
	}
	SteerTo(Target, Want, Err > 70.f && V->GetForwardSpeedMS() > 12.f);
}

// ====================================================================== pedestrians

ABoostedPedController::ABoostedPedController()
{
	PrimaryActorTick.bCanEverTick = true;
}

ABoostedCharacter* ABoostedPedController::Ped() const
{
	return Cast<ABoostedCharacter>(GetPawn());
}

void ABoostedPedController::SetLoop(const TArray<FVector>& Points, int32 Start, bool bClockwise)
{
	Loop = Points;
	Next = Loop.Num() ? Start % Loop.Num() : 0;
	Step = bClockwise ? 1 : -1;
}

void ABoostedPedController::Flee(const FVector& InFrom, float Seconds)
{
	FleeFrom = InFrom;
	FleeTime = Seconds;
}

void ABoostedPedController::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	ABoostedCharacter* P = Ped();
	if (!P || P->IsKnockedDown())
	{
		return;
	}
	CheckTraffic();
	if (P->IsKnockedDown())
	{
		return;
	}
	FVector Direction;
	if (FleeTime > 0.f)
	{
		FleeTime -= DeltaSeconds;
		Direction = Flat(P->GetActorLocation() - FleeFrom).GetSafeNormal();
		P->GetCharacterMovement()->MaxWalkSpeed = RunSpeed;
	}
	else
	{
		if (Loop.Num() == 0)
		{
			return;
		}
		if (FVector::Dist2D(Loop[Next], P->GetActorLocation()) < 120.f)
		{
			Next = (Next + Step + Loop.Num()) % Loop.Num();
		}
		Direction = Flat(Loop[Next] - P->GetActorLocation()).GetSafeNormal();
		P->GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
	}
	P->AddMovementInput(Direction, 1.f);
}

void ABoostedPedController::CheckTraffic()
{
	ABoostedCharacter* P = Ped();
	const FVector Me = P->GetActorLocation();
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It; ++It)
	{
		ABoostedVehicle* V = *It;
		const FVector Rel = Me - V->GetActorLocation();
		if (FMath::Abs(Rel.X) > 900.f || FMath::Abs(Rel.Y) > 900.f)
		{
			continue;
		}
		const float Speed = FMath::Abs(V->GetForwardSpeedMS());
		const float Along = FVector::DotProduct(Rel, V->GetActorForwardVector());
		const float Across = FMath::Abs(FVector::DotProduct(Rel, V->GetActorRightVector()));
		const float HalfLen = V->GetHalfLength();
		if (Speed > 4.f && FMath::Abs(Along) < HalfLen && Across < 140.f)
		{
			const FVector Impulse = V->GetVelocity() * 0.9f + FVector(0.f, 0.f, 350.f + Speed * 20.f);
			P->Knockdown(Impulse);
			if (ABoostedGameMode* GM = GetWorld()->GetAuthGameMode<ABoostedGameMode>())
			{
				GM->OnPedestrianHit(P, V);
			}
			return;
		}
		if (V->GetForwardSpeedMS() > 7.f && Along > HalfLen && Along < HalfLen + 900.f && Across < 260.f && FleeTime <= 0.f)
		{
			// car bearing down: dive sideways
			const FVector Side = V->GetActorRightVector() * (FVector::DotProduct(Rel, V->GetActorRightVector()) >= 0.f ? 1.f : -1.f);
			Flee(Me - Side * 400.f, 1.5f);
		}
	}
}
