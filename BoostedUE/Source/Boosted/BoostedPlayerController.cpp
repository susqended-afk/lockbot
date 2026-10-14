#include "BoostedPlayerController.h"
#include "BoostedCharacter.h"
#include "BoostedCity.h"
#include "BoostedGameInstance.h"
#include "BoostedGameMode.h"
#include "BoostedInputConfig.h"
#include "BoostedLocation.h"
#include "BoostedSettings.h"
#include "BoostedVehicle.h"
#include "UI/BoostedHUDWidget.h"
#include "UI/BoostedMenuWidget.h"
#include "Blueprint/UserWidget.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Camera/PlayerCameraManager.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "InputActionValue.h"
#include "Kismet/KismetSystemLibrary.h"
#include "TimerManager.h"

namespace
{
	const FLinearColor Green(0.24f, 1.f, 0.55f);
	const FLinearColor Red(1.f, 0.18f, 0.33f);
	const FLinearColor Gold(1.f, 0.79f, 0.29f);
	const FLinearColor Muted(0.62f, 0.65f, 0.7f);

	void Cycle(int32& Value, int32 Count, int32 Delta, int32 Min = 0)
	{
		const int32 Range = Count - Min;
		if (Range <= 0)
		{
			Value = Min;
			return;
		}
		Value = Min + ((Value - Min + Delta) % Range + Range) % Range;
	}

	FString PieceName(const TArray<FBoostedOutfitPiece>& List, int32 Index)
	{
		if (!List.IsValidIndex(Index))
		{
			return List.Num() ? TEXT("-") : TEXT("(none set up)");
		}
		return List[Index].Name.IsEmpty() ? FString::Printf(TEXT("Option %d"), Index + 1) : List[Index].Name;
	}

	FString ColorName(int32 Index)
	{
		const TArray<FPaintOption>& C = UBoostedSettings::Get()->ClothingColors;
		return C.IsValidIndex(Index) ? C[Index].Name : TEXT("-");
	}
}

ABoostedGameMode* ABoostedPlayerController::GM() const
{
	return GetWorld() ? GetWorld()->GetAuthGameMode<ABoostedGameMode>() : nullptr;
}

UBoostedGameInstance* ABoostedPlayerController::GI() const
{
	return GetGameInstance<UBoostedGameInstance>();
}

void ABoostedPlayerController::BeginPlay()
{
	Super::BeginPlay();
	if (!IsLocalController())
	{
		return;
	}
	HUD = CreateWidget<UBoostedHUDWidget>(this, UBoostedHUDWidget::StaticClass());
	if (HUD)
	{
		HUD->AddToViewport(0);
	}
	Menu = CreateWidget<UBoostedMenuWidget>(this, UBoostedMenuWidget::StaticClass());
	if (Menu)
	{
		Menu->AddToViewport(10);
		Menu->SetVisibility(ESlateVisibility::Collapsed);
	}
	FTimerHandle Handle;
	GetWorldTimerManager().SetTimer(Handle, [this]()
	{
		UBoostedGameInstance* G = GI();
		if (G && !G->bInGame)
		{
			ShowTitle();
		}
		else
		{
			ApplyInputContexts();
		}
	}, 0.2f, false);
}

void ABoostedPlayerController::SetupInputComponent()
{
	Super::SetupInputComponent();
	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(InputComponent);
	UBoostedGameInstance* G = GI();
	if (EIC && G)
	{
		EIC->BindAction(G->GetInputConfig()->Pause, ETriggerEvent::Started, this, &ABoostedPlayerController::OnPausePressed);
	}
}

void ABoostedPlayerController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);
	if (ABoostedCharacter* C = Cast<ABoostedCharacter>(InPawn))
	{
		const bool bFirst = OnFootCharacter != C;
		OnFootCharacter = C;
		if (bFirst && GI())
		{
			C->ApplyLook(GI()->Look);
		}
	}
	ApplyInputContexts();
}

void ABoostedPlayerController::ApplyInputContexts()
{
	UEnhancedInputLocalPlayerSubsystem* Sub = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer());
	UBoostedGameInstance* G = GI();
	if (!Sub || !G)
	{
		return;
	}
	const UBoostedInputConfig* In = G->GetInputConfig();
	Sub->ClearAllMappings();
	Sub->AddMappingContext(In->GlobalContext, 10);
	if (!bMenuOpen)
	{
		Sub->AddMappingContext(GetVehicle() ? In->DrivingContext : In->OnFootContext, 0);
	}
}

void ABoostedPlayerController::OnPausePressed(const FInputActionValue& Value)
{
	UBoostedGameInstance* G = GI();
	if (bMenuOpen)
	{
		if (BackAction)
		{
			TFunction<void()> Back = BackAction;
			Back();
		}
		else if (G && G->bInGame)
		{
			CloseMenu();
		}
		return;
	}
	if (G && G->bInGame)
	{
		ShowPause();
	}
}

// ---------------------------------------------------------------------- vehicles

ABoostedVehicle* ABoostedPlayerController::GetVehicle() const
{
	return Cast<ABoostedVehicle>(GetPawn());
}

void ABoostedPlayerController::EnterVehicle(ABoostedVehicle* V, bool bCarjack)
{
	ABoostedCharacter* C = OnFootCharacter ? OnFootCharacter.Get() : Cast<ABoostedCharacter>(GetPawn());
	ABoostedGameMode* Mode = GM();
	if (!V || !C || !Mode)
	{
		return;
	}
	OnFootCharacter = C;
	if (AController* Previous = V->GetController())
	{
		Previous->UnPossess();
		Previous->Destroy();
		if (bCarjack)
		{
			Mode->OnCarjack(V);
		}
	}
	V->bLocked = false;
	V->Role = EVehicleRole::Player;
	V->bSirenOn = false;
	V->bPursuit = false;
	V->Driver = C;
	if (!V->bOwned && !V->bStolen)
	{
		V->bStolen = true;
		V->bHot = true;
		Mode->OnPlayerStoleVehicle(V);
	}
	C->SetInVehicle(V);
	Possess(V);
	SetControlRotation(V->GetActorRotation());
}

void ABoostedPlayerController::ExitVehicle(bool bForce)
{
	ABoostedVehicle* V = GetVehicle();
	ABoostedCharacter* C = OnFootCharacter;
	if (!V || !C)
	{
		return;
	}
	if (!bForce && FMath::Abs(V->GetForwardSpeedMS()) > 4.f)
	{
		return;
	}
	const FRotator Rot(0.f, V->GetActorRotation().Yaw, 0.f);
	C->LeaveVehicle(V->GetDoorLocation() + FVector(0.f, 0.f, 90.f), Rot);
	FVector Spot = C->GetActorLocation();
	if (GetWorld()->FindTeleportSpot(C, Spot, Rot))
	{
		C->SetActorLocation(Spot);
	}
	V->Driver = nullptr;
	V->Role = EVehicleRole::Abandoned;
	Possess(C);
	SetControlRotation(FRotator(-10.f, Rot.Yaw, 0.f));
}

// ---------------------------------------------------------------------- HUD

void ABoostedPlayerController::Toast(const FString& Text, const FLinearColor& Color)
{
	if (HUD)
	{
		HUD->Toast(Text, Color);
	}
}

void ABoostedPlayerController::Banner(const FString& Big, const FString& Sub, const FLinearColor& Color)
{
	if (HUD)
	{
		HUD->Banner(Big, Sub, Color);
	}
}

FString ABoostedPlayerController::Directions(EBoostedLocationType Type) const
{
	ABoostedCity* City = ABoostedCity::Get(GetWorld());
	ABoostedLocation* Loc = City ? City->FindLocation(Type) : nullptr;
	APawn* P = GetPawn();
	if (!Loc || !P || !PlayerCameraManager)
	{
		return FString();
	}
	const FVector To = Loc->GetActorLocation() - P->GetActorLocation();
	const float Delta = FMath::FindDeltaAngleDegrees(PlayerCameraManager->GetCameraRotation().Yaw, To.Rotation().Yaw);
	const TCHAR* Where = FMath::Abs(Delta) < 35.f ? TEXT("ahead") : FMath::Abs(Delta) > 145.f ? TEXT("behind you") : Delta > 0.f ? TEXT("to the right") : TEXT("to the left");
	return FString::Printf(TEXT("%s: %dm %s"), *Loc->GetDisplayName(), FMath::RoundToInt(To.Size2D() / 100.f), Where);
}

FString ABoostedPlayerController::GetObjective() const
{
	const ABoostedGameMode* Mode = GM();
	const UBoostedGameInstance* G = GI();
	if (!Mode || !G)
	{
		return FString();
	}
	if (Mode->WantedLevel > 0)
	{
		return FString::Printf(TEXT("Lose the cops - break line of sight, or respray at %s"), *Directions(EBoostedLocationType::BodyShop));
	}
	const bool bDriving = GetVehicle() != nullptr;
	switch (G->Tutorial)
	{
	case 0:
		return bDriving ? TEXT("Drive it somewhere quiet") : TEXT("Find a parked car and HOLD E to break in");
	case 1:
		return bDriving
			? FString::Printf(TEXT("Chop it at %s  -  or keep it at %s"), *Directions(EBoostedLocationType::ChopShop), *Directions(EBoostedLocationType::Garage))
			: FString(TEXT("Steal another ride"));
	case 2:
		return TEXT("Check the Boost List (Esc) - Port Exports pays big for specific builds");
	default:
		return FString();
	}
}

// ---------------------------------------------------------------------- menu plumbing

void ABoostedPlayerController::OpenMenu(bool bPauseGame)
{
	if (!Menu)
	{
		return;
	}
	Menu->SetVisibility(ESlateVisibility::Visible);
	bMenuOpen = true;
	FInputModeGameAndUI Mode;
	Mode.SetHideCursorDuringCapture(false);
	Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
	SetInputMode(Mode);
	bShowMouseCursor = true;
	if (bPauseGame && !IsPaused())
	{
		SetPause(true);
		bPausedByMenu = true;
	}
	if (ABoostedVehicle* V = GetVehicle())
	{
		V->SetParked(true);
	}
	ApplyInputContexts();
}

void ABoostedPlayerController::CloseMenu()
{
	if (Menu)
	{
		Menu->SetVisibility(ESlateVisibility::Collapsed);
	}
	bMenuOpen = false;
	BackAction = nullptr;
	if (bPausedByMenu)
	{
		SetPause(false);
		bPausedByMenu = false;
	}
	SetInputMode(FInputModeGameOnly());
	bShowMouseCursor = false;
	if (ABoostedVehicle* V = GetVehicle())
	{
		V->SetParked(false);
	}
	RestoreCamera();
	ApplyInputContexts();
}

void ABoostedPlayerController::FocusCameraOn(AActor* Target, float Distance, float Height, float Side)
{
	if (!Target)
	{
		return;
	}
	if (!MenuCamera)
	{
		FActorSpawnParameters P;
		P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		MenuCamera = GetWorld()->SpawnActor<ACameraActor>(ACameraActor::StaticClass(), FTransform::Identity, P);
		if (MenuCamera)
		{
			MenuCamera->GetCameraComponent()->SetFieldOfView(45.f);
			MenuCamera->GetCameraComponent()->bConstrainAspectRatio = false;
		}
	}
	if (!MenuCamera)
	{
		return;
	}
	const FVector Fwd = Target->GetActorForwardVector();
	const FVector Right = Target->GetActorRightVector();
	const FVector Focus = Target->GetActorLocation() + FVector(0.f, 0.f, Height) + Right * Side;
	const FVector Eye = Focus + Fwd * Distance + FVector(0.f, 0.f, Distance * 0.08f);
	MenuCamera->SetActorLocationAndRotation(Eye, (Focus - Eye).Rotation());
	SetViewTargetWithBlend(MenuCamera, 0.6f, VTBlend_Cubic);
}

void ABoostedPlayerController::RestoreCamera()
{
	if (GetPawn() && GetViewTarget() != GetPawn())
	{
		SetViewTargetWithBlend(GetPawn(), 0.5f, VTBlend_Cubic);
	}
}

bool ABoostedPlayerController::Spend(int32 Cost, int32 CredRequired)
{
	UBoostedGameInstance* G = GI();
	if (!G)
	{
		return false;
	}
	if (G->GetCredLevel() < CredRequired)
	{
		Toast(FString::Printf(TEXT("Requires Street Cred LV %d"), CredRequired), Red);
		return false;
	}
	if (!G->CanAfford(Cost))
	{
		Toast(TEXT("Not enough cash"), Red);
		return false;
	}
	G->Cash -= Cost;
	return true;
}

void ABoostedPlayerController::Upgrade(ABoostedVehicle* V, TFunctionRef<void(FCarUpgrades&)> Change)
{
	if (!V)
	{
		return;
	}
	FCarUpgrades U = V->Upgrades;
	Change(U);
	V->ApplyUpgrades(U);
	if (GI())
	{
		GI()->SaveProfile();
	}
}

// ---------------------------------------------------------------------- locations

void ABoostedPlayerController::OnEnterLocation(ABoostedLocation* Location)
{
	ABoostedGameMode* Mode = GM();
	if (!Location || !Mode || bMenuOpen)
	{
		return;
	}
	ABoostedVehicle* V = GetVehicle();
	if (Mode->WantedLevel > 0 && Location->Type != EBoostedLocationType::BodyShop)
	{
		Toast(TEXT("Lose the cops first!"), Red);
		return;
	}
	switch (Location->Type)
	{
	case EBoostedLocationType::Garage:
		ShowGarage();
		break;
	case EBoostedLocationType::ChopShop:
		if (V) ShowChop(V); else Toast(TEXT("Bring a car here to chop it"), Gold);
		break;
	case EBoostedLocationType::Exports:
		if (V && !V->IsWrecked()) ShowExport(V); else Toast(V ? TEXT("Exporters don't buy wrecks - try the chop shop") : TEXT("Bring a car here to sell it"), Gold);
		break;
	case EBoostedLocationType::BodyShop:
		if (V) ShowBodyShop(V); else Toast(TEXT("Bring a car here to respray it"), Gold);
		break;
	default:
		break;
	}
}

// ---------------------------------------------------------------------- title & creator

void ABoostedPlayerController::ShowTitle()
{
	UBoostedGameInstance* G = GI();
	if (!Menu || !G)
	{
		return;
	}
	OpenMenu(false);
	BackAction = nullptr;
	if (APawn* P = GetPawn())
	{
		FocusCameraOn(P, 420.f, 40.f, 110.f);
	}
	Menu->SetPage(TEXT("BOOSTED"), TEXT("Steal it. Chop it. Build it. Flip it."));
	if (G->HasSave())
	{
		Menu->AddButton(TEXT("Continue"), [this]()
		{
			if (GI()->LoadProfile())
			{
				if (GM())
				{
					GM()->RespawnPlayerBody();
				}
				CloseMenu();
				Banner(TEXT("Welcome back"), GI()->Look.Name, FLinearColor::White);
			}
		}, true, true);
	}
	Menu->AddButton(TEXT("New Game"), [this]() { ShowCreator(true); }, true, !G->HasSave());
	Menu->AddButton(TEXT("How To Play"), [this]() { ShowControls([this]() { ShowTitle(); }); });
	Menu->AddButton(TEXT("Quit"), [this]() { UKismetSystemLibrary::QuitGame(this, this, EQuitPreference::Quit, false); });
	Menu->AddSpacer(20.f);
	Menu->AddText(TEXT("San Bravo. Hood blocks, chop shops and a port that ships anything. Make your name boosting cars."), Muted, 13);
}

void ABoostedPlayerController::ShowCreator(bool bNewGame)
{
	UBoostedGameInstance* G = GI();
	if (!Menu || !G)
	{
		return;
	}
	EditLook = G->Look;
	bCreatorNewGame = bNewGame;
	RenderCreator();
}

void ABoostedPlayerController::RenderCreator()
{
	const bool bNewGame = bCreatorNewGame;
	OpenMenu(false);
	BackAction = bNewGame ? TFunction<void()>([this]() { ShowTitle(); }) : TFunction<void()>([this]() { ShowGarage(); });
	FocusCameraOn(OnFootCharacter.Get(), 300.f, 20.f, 90.f);

	const UBoostedSettings* S = UBoostedSettings::Get();
	const int32 Colors = S->ClothingColors.Num();
	Menu->SetPage(bNewGame ? TEXT("Create Your Character") : TEXT("Wardrobe"),
		S->Bodies.Num() ? TEXT("Pick your body and your fit.") : TEXT("Add MetaHuman bodies and outfits in Project Settings > Game > Boosted (see Docs/SETUP.md)."));
	Menu->AddTextInput(TEXT("Street name"), EditLook.Name, [this](const FString& Text) { EditLook.Name = Text.Left(18); });

	Menu->AddHeader(TEXT("Body"));
	const FString BodyName = S->Bodies.IsValidIndex(EditLook.Body) ? S->Bodies[EditLook.Body].Name : TEXT("Default");
	Menu->AddOption(TEXT("Character"), BodyName,
		[this, S]() { Cycle(EditLook.Body, S->Bodies.Num(), -1); ApplyEditLook(true); },
		[this, S]() { Cycle(EditLook.Body, S->Bodies.Num(), 1); ApplyEditLook(true); },
		S->Bodies.Num() > 1);

	auto Piece = [this](const TCHAR* Label, int32& Field, const TArray<FBoostedOutfitPiece>& List)
	{
		int32* Ptr = &Field;
		const int32 Count = List.Num();
		Menu->AddOption(Label, PieceName(List, Field),
			[this, Ptr, Count]() { Cycle(*Ptr, Count, -1); ApplyEditLook(false); },
			[this, Ptr, Count]() { Cycle(*Ptr, Count, 1); ApplyEditLook(false); },
			Count > 1);
	};
	auto Color = [this, Colors](const TCHAR* Label, int32& Field)
	{
		int32* Ptr = &Field;
		Menu->AddOption(Label, ColorName(Field),
			[this, Ptr, Colors]() { Cycle(*Ptr, Colors, -1); ApplyEditLook(false); },
			[this, Ptr, Colors]() { Cycle(*Ptr, Colors, 1); ApplyEditLook(false); },
			Colors > 1);
	};

	Menu->AddHeader(TEXT("Fit"));
	Piece(TEXT("Top"), EditLook.Top, S->Tops);
	Color(TEXT("Top color"), EditLook.TopColor);
	Piece(TEXT("Bottoms"), EditLook.Bottom, S->Bottoms);
	Color(TEXT("Bottoms color"), EditLook.BottomColor);
	Piece(TEXT("Kicks"), EditLook.Shoes, S->Shoes);
	Color(TEXT("Kicks color"), EditLook.ShoesColor);
	Menu->AddHeader(TEXT("Drip"));
	Piece(TEXT("Headwear"), EditLook.Headwear, S->Headwear);
	Color(TEXT("Headwear color"), EditLook.HeadwearColor);
	const int32 Chains = S->Chains.Num();
	Menu->AddOption(TEXT("Chain"), S->Chains.IsValidIndex(EditLook.Chain) ? S->Chains[EditLook.Chain].Name : TEXT("None"),
		[this, Chains]() { Cycle(EditLook.Chain, Chains, -1, -1); ApplyEditLook(false); },
		[this, Chains]() { Cycle(EditLook.Chain, Chains, 1, -1); ApplyEditLook(false); },
		Chains > 0);

	Menu->AddSpacer(14.f);
	Menu->AddButton(TEXT("Randomize"), [this, S, Colors]()
	{
		auto Rand = [](int32 Count) { return Count > 0 ? FMath::RandRange(0, Count - 1) : 0; };
		EditLook.Top = Rand(S->Tops.Num());
		EditLook.Bottom = Rand(S->Bottoms.Num());
		EditLook.Shoes = Rand(S->Shoes.Num());
		EditLook.Headwear = Rand(S->Headwear.Num());
		EditLook.Chain = S->Chains.Num() && FMath::RandBool() ? Rand(S->Chains.Num()) : -1;
		EditLook.TopColor = Rand(Colors);
		EditLook.BottomColor = Rand(Colors);
		EditLook.ShoesColor = Rand(Colors);
		EditLook.HeadwearColor = Rand(Colors);
		ApplyEditLook(false);
	});
	Menu->AddButton(bNewGame ? TEXT("Hit the Streets") : TEXT("Save Fit"), [this]()
	{
		UBoostedGameInstance* G2 = GI();
		EditLook.Name = EditLook.Name.TrimStartAndEnd().IsEmpty() ? TEXT("Lil Boost") : EditLook.Name.TrimStartAndEnd();
		if (bCreatorNewGame)
		{
			G2->NewGame(EditLook);
			if (GM())
			{
				GM()->RespawnPlayerBody();
			}
			CloseMenu();
			Banner(TEXT("San Bravo"), FString::Printf(TEXT("Welcome to the block, %s"), *EditLook.Name), FLinearColor::White);
		}
		else
		{
			G2->Look = EditLook;
			G2->SaveProfile();
			Toast(TEXT("Fresh fit saved"));
			ShowGarage();
		}
	}, true, true);
	Menu->AddButton(TEXT("Back"), [this]() { if (BackAction) { TFunction<void()> B = BackAction; B(); } });
}

void ABoostedPlayerController::ApplyEditLook(bool bBodyChanged)
{
	UBoostedGameInstance* G = GI();
	if (bBodyChanged && G && GM())
	{
		const FCharacterLook Saved = G->Look;
		G->Look = EditLook;
		GM()->RespawnPlayerBody();
		if (!bCreatorNewGame)
		{
			G->Look = Saved; // only committed on Save
		}
	}
	else if (OnFootCharacter)
	{
		OnFootCharacter->ApplyLook(EditLook);
	}
	RenderCreator();
}

// ---------------------------------------------------------------------- garage

void ABoostedPlayerController::ShowGarage()
{
	UBoostedGameInstance* G = GI();
	ABoostedGameMode* Mode = GM();
	if (!Menu || !G || !Mode)
	{
		return;
	}
	OpenMenu(false);
	BackAction = [this]() { CloseMenu(); };
	ABoostedVehicle* V = GetVehicle();
	FocusCameraOn(V ? static_cast<AActor*>(V) : static_cast<AActor*>(OnFootCharacter.Get()), V ? 900.f : 320.f, V ? 60.f : 20.f, V ? 250.f : 90.f);

	Menu->SetPage(TEXT("The Spot"), FString::Printf(TEXT("Your garage  |  Cash %s"), *BoostedEconomy::Money(G->Cash)));
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	if (V)
	{
		Menu->AddHeader(V->GetDisplayName());
		Menu->AddText(FString::Printf(TEXT("Street value %s  |  Condition %d%%  |  %s"),
			*BoostedEconomy::Money(UBoostedGameInstance::CarValue(V->ModelId, V->Upgrades, V->Health)),
			FMath::RoundToInt(V->Health * 100.f), V->bHot ? TEXT("HOT - respray or swap the VIN before exporting") : TEXT("Clean title")),
			V->bHot ? Red : Muted, 14);
		Menu->AddButton(TEXT("Performance"), [this]() { ShowGaragePerformance(); }, true, false, TEXT(">"));
		Menu->AddButton(TEXT("Paint, Finish & Underglow"), [this]() { ShowGaragePaint(); }, true, false, TEXT(">"));
		Menu->AddButton(TEXT("Wheels, Spoiler, Tint & Plate"), [this]() { ShowGarageStyle(); }, true, false, TEXT(">"));
		const int32 Repair = UBoostedGameInstance::RepairCost(V->ModelId, V->Health);
		Menu->AddButton(TEXT("Repair"), [this, Weak, Repair]()
		{
			if (Weak.IsValid() && Spend(Repair))
			{
				Weak->Repair();
				GI()->SaveProfile();
				ShowGarage();
			}
		}, V->Health < 0.999f, false, BoostedEconomy::Money(Repair));
		Menu->AddButton(TEXT("Swap VIN & plates"), [this, Weak]()
		{
			if (Weak.IsValid() && Spend(BoostedEconomy::VinSwapCost))
			{
				Weak->bHot = false;
				Upgrade(Weak.Get(), [](FCarUpgrades& U) { U.Plate = BoostedEconomy::RandomPlate(); });
				Toast(TEXT("New plates & VIN - the car is clean"));
				ShowGarage();
			}
		}, V->bHot, false, BoostedEconomy::Money(BoostedEconomy::VinSwapCost));
		Menu->AddButton(TEXT("Store this car"), [this, Weak]()
		{
			if (Weak.IsValid() && GM()->StoreVehicle(Weak.Get()))
			{
				ShowGarage();
			}
		}, G->Garage.Num() < BoostedEconomy::GarageSlots, false, FString::Printf(TEXT("%d/%d"), G->Garage.Num(), BoostedEconomy::GarageSlots));
	}

	Menu->AddHeader(FString::Printf(TEXT("Your cars (%d/%d)"), G->Garage.Num(), BoostedEconomy::GarageSlots));
	if (G->Garage.Num() == 0)
	{
		Menu->AddText(TEXT("Nothing stored yet. Steal something nice and bring it here to keep it, upgrade it and make it yours."), Muted, 13);
	}
	for (int32 i = 0; i < G->Garage.Num(); ++i)
	{
		const FStoredCar& Car = G->Garage[i];
		const FString Label = FString::Printf(TEXT("%s %s"), V ? TEXT("Swap for") : TEXT("Take out"), *UBoostedGameInstance::CarName(Car.ModelId));
		Menu->AddButton(Label, [this, i]()
		{
			GM()->TakeOutCar(i);
			ShowGarage();
		}, true, false, FString::Printf(TEXT("%s%s"), *BoostedEconomy::Money(UBoostedGameInstance::CarValue(Car.ModelId, Car.Upgrades, Car.Health)), Car.bHot ? TEXT(" HOT") : TEXT("")));
	}
	Menu->AddHeader(TEXT("You"));
	Menu->AddButton(TEXT("Wardrobe"), [this]() { ShowCreator(false); }, OnFootCharacter != nullptr, false, TEXT(">"));
	Menu->AddSpacer(10.f);
	Menu->AddButton(V ? TEXT("Drive Out") : TEXT("Leave"), [this]() { CloseMenu(); }, true, true);
}

void ABoostedPlayerController::ShowGaragePerformance()
{
	ABoostedVehicle* V = GetVehicle();
	UBoostedGameInstance* G = GI();
	if (!V || !G)
	{
		ShowGarage();
		return;
	}
	BackAction = [this]() { ShowGarage(); };
	Menu->SetPage(TEXT("Performance"), FString::Printf(TEXT("%s  |  Cash %s  |  Street Cred LV %d"), *V->GetDisplayName(), *BoostedEconomy::Money(G->Cash), G->GetCredLevel()));
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	for (const EBoostedUpgrade Type : BoostedEconomy::AllUpgrades())
	{
		const int32 Level = V->Upgrades.GetLevel(Type);
		const int32 Max = BoostedEconomy::MaxLevel(Type);
		const FString Label = FString::Printf(TEXT("%s: %s"), *BoostedEconomy::UpgradeName(Type), *BoostedEconomy::LevelName(Type, Level));
		if (Level >= Max)
		{
			Menu->AddButton(Label, []() {}, false, false, TEXT("MAXED"));
			continue;
		}
		const int32 Next = Level + 1;
		const int32 Cost = BoostedEconomy::LevelCost(Type, Next);
		const int32 Cred = BoostedEconomy::CredRequired(Type, Next);
		const bool bLocked = G->GetCredLevel() < Cred;
		const FString Right = bLocked ? FString::Printf(TEXT("Needs LV %d"), Cred) : FString::Printf(TEXT("%s  %s"), *BoostedEconomy::LevelName(Type, Next), *BoostedEconomy::Money(Cost));
		Menu->AddButton(Label, [this, Weak, Type, Next, Cost, Cred]()
		{
			if (Weak.IsValid() && Spend(Cost, Cred))
			{
				Upgrade(Weak.Get(), [Type, Next](FCarUpgrades& U) { U.SetLevel(Type, Next); });
				ShowGaragePerformance();
			}
		}, !bLocked, false, Right);
	}
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back"), [this]() { ShowGarage(); });
}

void ABoostedPlayerController::ShowGaragePaint()
{
	ABoostedVehicle* V = GetVehicle();
	UBoostedGameInstance* G = GI();
	if (!V || !G)
	{
		ShowGarage();
		return;
	}
	BackAction = [this]() { ShowGarage(); };
	const UBoostedSettings* S = UBoostedSettings::Get();
	Menu->SetPage(TEXT("Paint & Finish"), FString::Printf(TEXT("Any respray swaps the VIN - a hot car comes out clean.  |  Cash %s"), *BoostedEconomy::Money(G->Cash)));
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	Menu->AddHeader(TEXT("Color"));
	for (int32 i = 0; i < S->Paints.Num(); ++i)
	{
		const bool bCurrent = V->Upgrades.PaintIndex == i;
		const FLinearColor Swatch = S->Paints[i].Color;
		Menu->AddButton(S->Paints[i].Name, [this, Weak, i, Swatch]()
		{
			if (Weak.IsValid() && Spend(BoostedEconomy::PaintCost))
			{
				const bool bWasHot = Weak->bHot;
				Weak->bHot = false;
				Upgrade(Weak.Get(), [i, Swatch](FCarUpgrades& U) { U.Paint = Swatch; U.PaintIndex = i; });
				if (bWasHot)
				{
					Toast(TEXT("Fresh paint - VIN swapped, the car is clean"));
				}
				ShowGaragePaint();
			}
		}, !bCurrent, false, bCurrent ? TEXT("CURRENT") : BoostedEconomy::Money(BoostedEconomy::PaintCost), &Swatch);
	}
	Menu->AddHeader(TEXT("Finish"));
	for (const EPaintFinish F : { EPaintFinish::Gloss, EPaintFinish::Metallic, EPaintFinish::Matte, EPaintFinish::Pearl, EPaintFinish::Chrome })
	{
		const bool bCurrent = V->Upgrades.Finish == F;
		const int32 Cost = BoostedEconomy::FinishCost(F);
		const int32 Cred = F == EPaintFinish::Chrome ? 3 : 1;
		Menu->AddButton(BoostedEconomy::FinishName(F), [this, Weak, F, Cost, Cred]()
		{
			if (Weak.IsValid() && Spend(Cost, Cred))
			{
				Upgrade(Weak.Get(), [F](FCarUpgrades& U) { U.Finish = F; });
				ShowGaragePaint();
			}
		}, !bCurrent, false, bCurrent ? TEXT("CURRENT") : (Cred > G->GetCredLevel() ? FString::Printf(TEXT("Needs LV %d"), Cred) : BoostedEconomy::Money(Cost)));
	}
	Menu->AddHeader(TEXT("Underglow"));
	if (!V->Upgrades.bUnderglow)
	{
		Menu->AddButton(TEXT("Install underglow"), [this, Weak]()
		{
			if (Weak.IsValid() && Spend(BoostedEconomy::UnderglowCost))
			{
				Upgrade(Weak.Get(), [](FCarUpgrades& U) { U.bUnderglow = true; });
				ShowGaragePaint();
			}
		}, true, false, BoostedEconomy::Money(BoostedEconomy::UnderglowCost));
	}
	else
	{
		Menu->AddOption(TEXT("Underglow color"), TEXT("Change"),
			[this, Weak]() { if (Weak.IsValid()) { Upgrade(Weak.Get(), [](FCarUpgrades& U) { U.UnderglowColor = FLinearColor::MakeRandomColor(); }); } },
			[this, Weak]() { if (Weak.IsValid()) { Upgrade(Weak.Get(), [](FCarUpgrades& U) { U.UnderglowColor = FLinearColor::MakeRandomColor(); }); } });
		Menu->AddButton(TEXT("Remove underglow"), [this, Weak]()
		{
			if (Weak.IsValid())
			{
				Upgrade(Weak.Get(), [](FCarUpgrades& U) { U.bUnderglow = false; });
				ShowGaragePaint();
			}
		});
	}
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back"), [this]() { ShowGarage(); });
}

void ABoostedPlayerController::ShowGarageStyle()
{
	ABoostedVehicle* V = GetVehicle();
	UBoostedGameInstance* G = GI();
	if (!V || !G)
	{
		ShowGarage();
		return;
	}
	BackAction = [this]() { ShowGarage(); };
	Menu->SetPage(TEXT("Wheels & Style"), FString::Printf(TEXT("Cash %s"), *BoostedEconomy::Money(G->Cash)));
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	auto Option = [this, Weak](const TCHAR* Label, int32 Value, int32 Count, int32 Cost, int32 FCarUpgrades::*Field)
	{
		auto Change = [this, Weak, Count, Cost, Field](int32 Delta)
		{
			if (Weak.IsValid() && Spend(Cost))
			{
				Upgrade(Weak.Get(), [Count, Delta, Field](FCarUpgrades& U) { Cycle(U.*Field, Count, Delta); });
				ShowGarageStyle();
			}
		};
		Menu->AddOption(FString::Printf(TEXT("%s  (%s)"), Label, *BoostedEconomy::Money(Cost)), FString::Printf(TEXT("Style %d"), Value + 1),
			[Change]() { Change(-1); }, [Change]() { Change(1); });
	};
	Option(TEXT("Wheels"), V->Upgrades.Wheels, 8, 1500, &FCarUpgrades::Wheels);
	Option(TEXT("Spoiler"), V->Upgrades.Spoiler, 4, 800, &FCarUpgrades::Spoiler);
	Option(TEXT("Window tint"), V->Upgrades.Tint, 4, 300, &FCarUpgrades::Tint);
	Menu->AddText(TEXT("Wheel and spoiler styles are swapped by the car's Blueprint (OnUpgradesApplied) - see Docs/SETUP.md."), Muted, 12);
	Menu->AddTextInput(TEXT("Vanity plate"), V->Upgrades.Plate, [Weak](const FString& Text)
	{
		if (Weak.IsValid())
		{
			Weak->Upgrades.Plate = Text.Left(8).ToUpper();
		}
	});
	Menu->AddButton(TEXT("Set plate"), [this, Weak]()
	{
		if (Weak.IsValid() && Spend(BoostedEconomy::PlateCost))
		{
			Upgrade(Weak.Get(), [](FCarUpgrades& U) {});
			Toast(TEXT("Plate registered"));
		}
	}, true, false, BoostedEconomy::Money(BoostedEconomy::PlateCost));
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back"), [this]() { ShowGarage(); });
}

// ---------------------------------------------------------------------- chop / export / body shop

void ABoostedPlayerController::ShowChop(ABoostedVehicle* V)
{
	OpenMenu(false);
	BackAction = [this]() { CloseMenu(); };
	FocusCameraOn(V, 900.f, 60.f, 250.f);
	const int32 Price = UBoostedGameInstance::ChopPrice(V->ModelId, V->Upgrades, V->Health);
	Menu->SetPage(TEXT("EZ Auto Parts"), TEXT("\"No questions asked. We strip it for parts in ten minutes.\""));
	Menu->AddHeader(V->GetDisplayName());
	Menu->AddText(FString::Printf(TEXT("Condition %d%%  |  Full value %s"), FMath::RoundToInt(V->Health * 100.f),
		*BoostedEconomy::Money(UBoostedGameInstance::CarValue(V->ModelId, V->Upgrades, V->Health))), Muted, 14);
	if (V->bOwned)
	{
		Menu->AddText(TEXT("This is one of YOUR cars. Chopping it is permanent."), Red, 14);
	}
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	Menu->AddSpacer(8.f);
	Menu->AddButton(TEXT("Chop it"), [this, Weak]()
	{
		CloseMenu();
		if (Weak.IsValid())
		{
			GM()->ChopVehicle(Weak.Get());
		}
	}, true, true, BoostedEconomy::Money(Price));
	Menu->AddButton(TEXT("Leave"), [this]() { CloseMenu(); });
}

void ABoostedPlayerController::ShowExport(ABoostedVehicle* V)
{
	UBoostedGameInstance* G = GI();
	OpenMenu(false);
	BackAction = [this]() { CloseMenu(); };
	FocusCameraOn(V, 900.f, 60.f, 250.f);
	const int32 Offer = UBoostedGameInstance::ExportPrice(V->ModelId, V->Upgrades, V->Health, V->bHot);
	const int32 Best = G->FindBestContract(V->ModelId, V->Upgrades);
	const int32 Pay = Best != INDEX_NONE ? FMath::Max(Offer, G->Contracts[Best].Reward) : Offer;
	Menu->SetPage(TEXT("Port Exports"), TEXT("Ships out overseas tonight. Clean cars pay full price."));
	Menu->AddHeader(V->GetDisplayName());
	Menu->AddText(FString::Printf(TEXT("Title: %s  |  Exporter offer %s"), V->bHot ? TEXT("HOT (-35%)") : TEXT("CLEAN"), *BoostedEconomy::Money(Offer)), V->bHot ? Red : Muted, 14);
	Menu->AddHeader(TEXT("Boost list"));
	for (const FBoostContract& C : G->Contracts)
	{
		const TArray<FString> Missing = G->MissingForContract(C, V->ModelId, V->Upgrades);
		const bool bMatch = Missing.Num() == 0;
		Menu->AddText(FString::Printf(TEXT("%s - %s wants: %s"), *BoostedEconomy::Money(C.Reward), *C.Buyer, *FString::Join(G->DescribeContract(C), TEXT(", "))),
			bMatch ? Green : FLinearColor::White, 14);
		if (!bMatch && Missing[0] != TEXT("wrong model"))
		{
			Menu->AddText(FString::Printf(TEXT("    Missing: %s"), *FString::Join(Missing, TEXT(", "))), Gold, 12);
		}
	}
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	Menu->AddSpacer(8.f);
	const FString Label = Best != INDEX_NONE ? FString::Printf(TEXT("Sell to %s"), *G->Contracts[Best].Buyer) : FString(TEXT("Sell"));
	Menu->AddButton(Label, [this, Weak]()
	{
		CloseMenu();
		if (Weak.IsValid())
		{
			GM()->ExportVehicle(Weak.Get());
		}
	}, true, true, BoostedEconomy::Money(Pay));
	Menu->AddButton(TEXT("Leave"), [this]() { CloseMenu(); });
}

void ABoostedPlayerController::ShowBodyShop(ABoostedVehicle* V)
{
	OpenMenu(false);
	BackAction = [this]() { CloseMenu(); };
	FocusCameraOn(V, 900.f, 60.f, 250.f);
	const int32 Cost = BoostedEconomy::VinSwapCost + UBoostedGameInstance::RepairCost(V->ModelId, V->Health);
	Menu->SetPage(TEXT("Fresh Coat"), TEXT("Respray, new plates, dents knocked out. The cops lose your description."));
	Menu->AddHeader(V->GetDisplayName());
	if (GM()->WantedLevel > 0 && GM()->bCopsSeePlayer)
	{
		Menu->AddText(TEXT("The cops are watching - they saw you pull in. Lose them first."), Red, 14);
	}
	TWeakObjectPtr<ABoostedVehicle> Weak(V);
	Menu->AddButton(TEXT("Respray & repair"), [this, Weak]()
	{
		if (Weak.IsValid() && GM()->ResprayVehicle(Weak.Get()))
		{
			CloseMenu();
		}
	}, true, true, BoostedEconomy::Money(Cost));
	Menu->AddButton(TEXT("Leave"), [this]() { CloseMenu(); });
}

// ---------------------------------------------------------------------- pause & info

void ABoostedPlayerController::ShowPause()
{
	UBoostedGameInstance* G = GI();
	if (!Menu || !G)
	{
		return;
	}
	OpenMenu(true);
	BackAction = [this]() { CloseMenu(); };
	const int32 Level = G->GetCredLevel();
	Menu->SetPage(TEXT("Paused"), FString::Printf(TEXT("%s  |  %s  |  Street Cred LV %d (%d / %d XP)"), *G->Look.Name, *BoostedEconomy::Money(G->Cash), Level, G->XP, BoostedEconomy::XPForLevel(Level + 1)));
	Menu->AddText(FString::Printf(TEXT("Stolen %d  |  Chopped %d  |  Exported %d  |  Contracts %d"), G->Stats.Stolen, G->Stats.Chopped, G->Stats.Exported, G->Stats.Contracts), Muted, 13);
	Menu->AddSpacer(8.f);
	Menu->AddButton(TEXT("Resume"), [this]() { CloseMenu(); }, true, true);
	Menu->AddButton(TEXT("Boost List"), [this]() { ShowBoostList([this]() { ShowPause(); }); }, true, false, TEXT(">"));
	Menu->AddButton(TEXT("How To Play"), [this]() { ShowControls([this]() { ShowPause(); }); }, true, false, TEXT(">"));
	Menu->AddButton(TEXT("Save"), [this]() { GI()->SaveProfile(); Toast(TEXT("Game saved")); });
	Menu->AddButton(TEXT("Save & Quit"), [this]()
	{
		GI()->SaveProfile();
		UKismetSystemLibrary::QuitGame(this, this, EQuitPreference::Quit, false);
	});
}

void ABoostedPlayerController::ShowBoostList(TFunction<void()> Back)
{
	UBoostedGameInstance* G = GI();
	BackAction = Back;
	Menu->SetPage(TEXT("Boost List"), TEXT("Deliver matching cars to Port Exports. Upgrade or respray at The Spot to meet the specs."));
	for (const FBoostContract& C : G->Contracts)
	{
		Menu->AddHeader(FString::Printf(TEXT("%s - %s"), *C.Buyer, *BoostedEconomy::Money(C.Reward)));
		Menu->AddText(FString::Join(G->DescribeContract(C), TEXT("  |  ")), FLinearColor::White, 14);
	}
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back"), [Back]() { Back(); });
}

void ABoostedPlayerController::ShowControls(TFunction<void()> Back)
{
	BackAction = Back;
	Menu->SetPage(TEXT("How To Play"), TEXT("Steal cars, lose the cops, then chop them, export them, or keep them and build them up."));
	const TCHAR* Lines[] = {
		TEXT("Move / drive: W A S D  (gamepad: left stick, RT gas, LT brake)"),
		TEXT("Look: mouse / right stick"),
		TEXT("Sprint / nitrous: Shift  (B)"),
		TEXT("Jump / handbrake: Space  (A)"),
		TEXT("Break in (hold), carjack, get in / out: E  (Y)"),
		TEXT("Horn: H    Pause: Esc  (Start)"),
	};
	for (const TCHAR* L : Lines)
	{
		Menu->AddText(L, FLinearColor::White, 14);
	}
	Menu->AddHeader(TEXT("Making money"));
	Menu->AddText(TEXT("EZ Auto Parts (chop shop): any car, any condition - about half its value."), Muted, 13);
	Menu->AddText(TEXT("Port Exports: full value for clean cars, and the boost list pays extra for exact builds."), Muted, 13);
	Menu->AddText(TEXT("Fresh Coat (body shop): respray + repair; clears your stars if no cop sees you pull in."), Muted, 13);
	Menu->AddText(TEXT("The Spot (your garage): store 5 cars, upgrade them, swap VINs, change your fit."), Muted, 13);
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back"), [Back]() { Back(); });
}

void ABoostedPlayerController::ShowBusted(int32 Fine, const FString& LostCar)
{
	if (!Menu)
	{
		return;
	}
	OpenMenu(false);
	BackAction = [this]() { CloseMenu(); };
	Menu->SetPage(TEXT("Busted"), TEXT("Spent the night downtown. Your folks bailed you out."));
	Menu->AddText(FString::Printf(TEXT("Bail: -%s"), *BoostedEconomy::Money(Fine)), Red, 18);
	if (!LostCar.IsEmpty())
	{
		Menu->AddText(FString::Printf(TEXT("Impounded: %s"), *LostCar), Muted, 15);
	}
	Menu->AddSpacer(10.f);
	Menu->AddButton(TEXT("Back to the block"), [this]() { CloseMenu(); }, true, true);
}
