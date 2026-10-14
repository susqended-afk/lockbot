#include "BoostedCharacter.h"
#include "BoostedVehicle.h"
#include "BoostedGameMode.h"
#include "BoostedGameInstance.h"
#include "BoostedInputConfig.h"
#include "BoostedPlayerController.h"
#include "BoostedSettings.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "EnhancedInputComponent.h"
#include "InputActionValue.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/StaticMesh.h"
#include "Animation/AnimInstance.h"
#include "EngineUtils.h"

ABoostedCharacter::ABoostedCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	GetCapsuleComponent()->InitCapsuleSize(42.f, 96.f);
	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	UCharacterMovementComponent* MoveComp = GetCharacterMovement();
	MoveComp->bOrientRotationToMovement = true;
	MoveComp->RotationRate = FRotator(0.f, 540.f, 0.f);
	MoveComp->MaxWalkSpeed = JogSpeed;
	MoveComp->JumpZVelocity = 520.f;
	MoveComp->AirControl = 0.35f;
	MoveComp->BrakingDecelerationWalking = 2000.f;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 380.f;
	CameraBoom->SocketOffset = FVector(0.f, 55.f, 65.f);
	CameraBoom->bUsePawnControlRotation = true;

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;

	GetMesh()->SetRelativeLocationAndRotation(FVector(0.f, 0.f, -96.f), FRotator(0.f, -90.f, 0.f));

	auto MakeSlot = [this](const TCHAR* Name)
	{
		USkeletalMeshComponent* Slot = CreateDefaultSubobject<USkeletalMeshComponent>(Name);
		Slot->SetupAttachment(GetMesh());
		Slot->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		return Slot;
	};
	TopSlot = MakeSlot(TEXT("TopSlot"));
	BottomSlot = MakeSlot(TEXT("BottomSlot"));
	ShoesSlot = MakeSlot(TEXT("ShoesSlot"));
	HeadwearSlot = MakeSlot(TEXT("HeadwearSlot"));
	ChainSlot = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("ChainSlot"));
	ChainSlot->SetupAttachment(GetMesh());
	ChainSlot->SetCollisionEnabled(ECollisionEnabled::NoCollision);

	// MetaHuman Blueprints name their clothing components like this
	TopComponentNames = { TEXT("Torso") };
	BottomComponentNames = { TEXT("Legs") };
	ShoesComponentNames = { TEXT("Feet") };
}

void ABoostedCharacter::BeginPlay()
{
	Super::BeginPlay();
	EnsureMesh();
	USkeletalMeshComponent* Body = GetBodyComponent();
	for (USkeletalMeshComponent* Slot : { TopSlot.Get(), BottomSlot.Get(), ShoesSlot.Get(), HeadwearSlot.Get() })
	{
		if (Slot && Body && Slot != Body)
		{
			Slot->SetLeaderPoseComponent(Body);
		}
	}
	GetCharacterMovement()->MaxWalkSpeed = JogSpeed;
}

void ABoostedCharacter::EnsureMesh()
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	USkeletalMeshComponent* M = GetMesh();
	if (!M->GetSkeletalMeshAsset())
	{
		for (const FSoftObjectPath& Path : S->FallbackCharacterMeshes)
		{
			if (USkeletalMesh* FallbackMesh = Cast<USkeletalMesh>(Path.TryLoad()))
			{
				M->SetSkeletalMeshAsset(FallbackMesh);
				break;
			}
		}
	}
	if (!M->GetAnimClass())
	{
		for (const FSoftClassPath& Path : S->FallbackAnimClasses)
		{
			if (UClass* Cls = Path.TryLoadClass<UAnimInstance>())
			{
				M->SetAnimInstanceClass(Cls);
				break;
			}
		}
	}
}

USkeletalMeshComponent* ABoostedCharacter::FindSkeletalByNames(const TArray<FName>& Names) const
{
	TArray<USkeletalMeshComponent*> Comps;
	GetComponents<USkeletalMeshComponent>(Comps);
	for (USkeletalMeshComponent* C : Comps)
	{
		for (const FName& N : Names)
		{
			if (C && C->GetFName() == N)
			{
				return C;
			}
		}
	}
	return nullptr;
}

USkeletalMeshComponent* ABoostedCharacter::GetBodyComponent() const
{
	if (USkeletalMeshComponent* Body = FindSkeletalByNames({ BodyComponentName }))
	{
		return Body;
	}
	return GetMesh();
}

// ---------------------------------------------------------------------- wardrobe

void ABoostedCharacter::DressSlot(USkeletalMeshComponent* Target, const TArray<FBoostedOutfitPiece>& List, int32 Index, int32 ColorIndex)
{
	// An empty wardrobe list leaves whatever the character already wears (e.g. its MetaHuman outfit).
	if (!Target || List.Num() == 0)
	{
		return;
	}
	const FBoostedOutfitPiece& Piece = List[FMath::Clamp(Index, 0, List.Num() - 1)];
	USkeletalMesh* PieceMesh = Piece.Mesh.IsNull() ? nullptr : Piece.Mesh.LoadSynchronous();
	Target->SetSkeletalMeshAsset(PieceMesh);
	Target->SetVisibility(PieceMesh != nullptr);
	const UBoostedSettings* S = UBoostedSettings::Get();
	if (PieceMesh && Piece.bTintable && S->ClothingColors.IsValidIndex(ColorIndex))
	{
		const FLinearColor Color = S->ClothingColors[ColorIndex].Color;
		for (int32 i = 0; i < Target->GetNumMaterials(); ++i)
		{
			if (UMaterialInstanceDynamic* MID = Target->CreateAndSetMaterialInstanceDynamic(i))
			{
				for (const FName& Param : S->ClothingColorParameters)
				{
					MID->SetVectorParameterValue(Param, Color);
				}
			}
		}
	}
}

void ABoostedCharacter::ApplyLook(const FCharacterLook& Look)
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	USkeletalMeshComponent* TopTarget = FindSkeletalByNames(TopComponentNames);
	USkeletalMeshComponent* BottomTarget = FindSkeletalByNames(BottomComponentNames);
	USkeletalMeshComponent* ShoesTarget = FindSkeletalByNames(ShoesComponentNames);
	DressSlot(TopTarget ? TopTarget : TopSlot.Get(), S->Tops, Look.Top, Look.TopColor);
	DressSlot(BottomTarget ? BottomTarget : BottomSlot.Get(), S->Bottoms, Look.Bottom, Look.BottomColor);
	DressSlot(ShoesTarget ? ShoesTarget : ShoesSlot.Get(), S->Shoes, Look.Shoes, Look.ShoesColor);
	DressSlot(HeadwearSlot, S->Headwear, Look.Headwear, Look.HeadwearColor);

	ChainSlot->SetStaticMesh(nullptr);
	if (S->Chains.IsValidIndex(Look.Chain))
	{
		const FBoostedAccessory& Acc = S->Chains[Look.Chain];
		if (UStaticMesh* ChainMesh = Acc.Mesh.IsNull() ? nullptr : Acc.Mesh.LoadSynchronous())
		{
			ChainSlot->AttachToComponent(GetBodyComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale, Acc.Socket);
			ChainSlot->SetRelativeTransform(Acc.Offset);
			ChainSlot->SetStaticMesh(ChainMesh);
		}
	}
	OnLookApplied(Look);
}

// ---------------------------------------------------------------------- input

void ABoostedCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	UBoostedGameInstance* GI = GetGameInstance<UBoostedGameInstance>();
	if (!EIC || !GI)
	{
		return;
	}
	const UBoostedInputConfig* In = GI->GetInputConfig();
	EIC->BindAction(In->Move, ETriggerEvent::Triggered, this, &ABoostedCharacter::Move);
	EIC->BindAction(In->Look, ETriggerEvent::Triggered, this, &ABoostedCharacter::Look);
	EIC->BindAction(In->Jump, ETriggerEvent::Started, this, &ACharacter::Jump);
	EIC->BindAction(In->Jump, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
	EIC->BindAction(In->Sprint, ETriggerEvent::Started, this, &ABoostedCharacter::SprintStart);
	EIC->BindAction(In->Sprint, ETriggerEvent::Completed, this, &ABoostedCharacter::SprintStop);
	EIC->BindAction(In->Interact, ETriggerEvent::Started, this, &ABoostedCharacter::InteractStart);
	EIC->BindAction(In->Interact, ETriggerEvent::Completed, this, &ABoostedCharacter::InteractStop);
}

void ABoostedCharacter::Move(const FInputActionValue& Value)
{
	if (!Controller || BreakInProgress > 0.f || bKnockedDown)
	{
		return;
	}
	const FVector2D V = Value.Get<FVector2D>();
	const FRotator Yaw(0.f, Controller->GetControlRotation().Yaw, 0.f);
	const FRotationMatrix R(Yaw);
	AddMovementInput(R.GetUnitAxis(EAxis::X), V.Y);
	AddMovementInput(R.GetUnitAxis(EAxis::Y), V.X);
}

void ABoostedCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D V = Value.Get<FVector2D>();
	AddControllerYawInput(V.X);
	AddControllerPitchInput(V.Y);
}

void ABoostedCharacter::SprintStart(const FInputActionValue& Value)
{
	GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
}

void ABoostedCharacter::SprintStop(const FInputActionValue& Value)
{
	GetCharacterMovement()->MaxWalkSpeed = JogSpeed;
}

void ABoostedCharacter::InteractStart(const FInputActionValue& Value)
{
	bInteractHeld = true;
	bInteractPressed = true;
}

void ABoostedCharacter::InteractStop(const FInputActionValue& Value)
{
	bInteractHeld = false;
}

// ---------------------------------------------------------------------- stealing

void ABoostedCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (IsPlayerControlled() && !IsHidden())
	{
		UpdateInteraction(DeltaSeconds);
	}
	bInteractPressed = false;
}

ABoostedVehicle* ABoostedCharacter::FindNearbyVehicle() const
{
	ABoostedVehicle* Best = nullptr;
	float BestDist = InteractRange;
	const FVector Me = GetActorLocation();
	for (TActorIterator<ABoostedVehicle> It(GetWorld()); It; ++It)
	{
		ABoostedVehicle* V = *It;
		if (!V || V->IsActorBeingDestroyed() || V->Role == EVehicleRole::Player)
		{
			continue;
		}
		const float DoorDist = FVector::Dist2D(V->GetDoorLocation(), Me);
		const float BodyDist = FVector::Dist2D(V->GetActorLocation(), Me) - V->GetHalfLength() * 0.6f;
		const float D = FMath::Min(DoorDist, BodyDist + 60.f);
		if (D < BestDist)
		{
			BestDist = D;
			Best = V;
		}
	}
	return Best;
}

void ABoostedCharacter::UpdateInteraction(float DeltaSeconds)
{
	PromptText.Reset();
	PromptKey.Reset();
	PromptProgress = -1.f;
	ABoostedPlayerController* PC = Cast<ABoostedPlayerController>(GetController());
	ABoostedGameMode* GM = GetWorld()->GetAuthGameMode<ABoostedGameMode>();
	if (!PC || PC->IsMenuOpen())
	{
		return;
	}

	ABoostedVehicle* V = (BreakInProgress > 0.f && FocusVehicle.IsValid()) ? FocusVehicle.Get() : FindNearbyVehicle();
	if (V && BreakInProgress > 0.f && FVector::Dist2D(V->GetActorLocation(), GetActorLocation()) > InteractRange + V->GetHalfLength())
	{
		V = nullptr;
	}
	FocusVehicle = V;
	if (!V)
	{
		if (BreakInProgress > 0.f)
		{
			BreakInProgress = 0.f;
			OnBreakInStopped();
		}
		return;
	}

	const FString Name = V->GetDisplayName();
	if (V->HasAIDriver())
	{
		if (FMath::Abs(V->GetForwardSpeedMS()) > 4.f)
		{
			return;
		}
		PromptKey = TEXT("E");
		PromptText = FString::Printf(TEXT("Carjack the %s%s"), *Name, V->bIsPolice ? TEXT(" (police!)") : TEXT(""));
		if (bInteractPressed)
		{
			PC->EnterVehicle(V, true);
		}
		return;
	}

	if (V->bLocked)
	{
		const float Duration = V->bIsPolice ? PoliceBreakInTime : BreakInTime;
		PromptKey = TEXT("Hold E");
		PromptText = FString::Printf(TEXT("Break into the %s%s"), *Name, V->bIsPolice ? TEXT(" (police car!)") : TEXT(""));
		if (bInteractHeld)
		{
			if (BreakInProgress <= 0.f)
			{
				OnBreakInStarted();
			}
			BreakInProgress += DeltaSeconds;
			const FVector ToCar = V->GetActorLocation() - GetActorLocation();
			SetActorRotation(FRotator(0.f, ToCar.Rotation().Yaw, 0.f));
			PromptProgress = BreakInProgress / Duration;
			if (BreakInProgress >= Duration)
			{
				BreakInProgress = 0.f;
				OnBreakInStopped();
				V->bLocked = false;
				if (GM)
				{
					GM->OnBreakIn(V);
				}
				PC->EnterVehicle(V, false);
			}
		}
		else if (BreakInProgress > 0.f)
		{
			BreakInProgress = 0.f;
			OnBreakInStopped();
		}
		return;
	}

	PromptKey = TEXT("E");
	PromptText = FString::Printf(TEXT("Get in the %s"), *Name);
	if (bInteractPressed)
	{
		PC->EnterVehicle(V, false);
	}
}

// ---------------------------------------------------------------------- vehicles & knockdowns

void ABoostedCharacter::SetInVehicle(ABoostedVehicle* Vehicle)
{
	BreakInProgress = 0.f;
	GetCharacterMovement()->StopMovementImmediately();
	GetCharacterMovement()->DisableMovement();
	SetActorEnableCollision(false);
	SetActorHiddenInGame(true);
	if (Vehicle)
	{
		AttachToActor(Vehicle, FAttachmentTransformRules::KeepWorldTransform);
	}
}

void ABoostedCharacter::LeaveVehicle(const FVector& Location, const FRotator& Rotation)
{
	DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
	SetActorLocationAndRotation(Location, FRotator(0.f, Rotation.Yaw, 0.f), false, nullptr, ETeleportType::TeleportPhysics);
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
	GetCharacterMovement()->SetMovementMode(MOVE_Walking);
	GetCharacterMovement()->MaxWalkSpeed = JogSpeed;
	bInteractHeld = false;
}

void ABoostedCharacter::Knockdown(const FVector& Impulse)
{
	if (bKnockedDown)
	{
		return;
	}
	bKnockedDown = true;
	GetCharacterMovement()->DisableMovement();
	GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	USkeletalMeshComponent* Body = GetMesh();
	Body->SetCollisionProfileName(TEXT("Ragdoll"));
	Body->SetSimulatePhysics(true);
	Body->AddImpulse(Impulse, NAME_None, true);
	SetLifeSpan(20.f);
}
