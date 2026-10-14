#include "BoostedVehicle.h"
#include "BoostedCharacter.h"
#include "BoostedGameMode.h"
#include "BoostedGameInstance.h"
#include "BoostedInputConfig.h"
#include "BoostedPlayerController.h"
#include "BoostedSettings.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "ChaosVehicleWheel.h"
#include "Components/AudioComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "EnhancedInputComponent.h"
#include "InputActionValue.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "AIController.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"

ABoostedVehicle::ABoostedVehicle()
{
	PrimaryActorTick.bCanEverTick = true;

	SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("ChaseArm"));
	SpringArm->SetupAttachment(GetMesh());
	SpringArm->SetRelativeLocation(FVector(0.f, 0.f, 80.f));
	SpringArm->TargetArmLength = 700.f;
	SpringArm->SocketOffset = FVector(0.f, 0.f, 120.f);
	SpringArm->bUsePawnControlRotation = false;
	SpringArm->bInheritPitch = false;
	SpringArm->bInheritRoll = false;
	SpringArm->bEnableCameraLag = true;
	SpringArm->CameraLagSpeed = 12.f;
	SpringArm->bEnableCameraRotationLag = true;
	SpringArm->CameraRotationLagSpeed = 6.f;

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
	Camera->SetupAttachment(SpringArm, USpringArmComponent::SocketName);
	Camera->FieldOfView = 85.f;

	auto MakeLight = [this](const TCHAR* Name, const FVector& Loc, const FLinearColor& Color, float Radius)
	{
		UPointLightComponent* L = CreateDefaultSubobject<UPointLightComponent>(Name);
		L->SetupAttachment(GetMesh());
		L->SetRelativeLocation(Loc);
		L->SetLightColor(Color);
		L->SetIntensityUnits(ELightUnits::Candelas);
		L->SetIntensity(0.f);
		L->SetAttenuationRadius(Radius);
		L->SetCastShadows(false);
		return L;
	};
	SirenRed = MakeLight(TEXT("SirenRed"), FVector(-10.f, -45.f, 165.f), FLinearColor(1.f, 0.05f, 0.05f), 2500.f);
	SirenBlue = MakeLight(TEXT("SirenBlue"), FVector(-10.f, 45.f, 165.f), FLinearColor(0.1f, 0.25f, 1.f), 2500.f);
	UnderglowLight = MakeLight(TEXT("Underglow"), FVector(0.f, 0.f, 12.f), FLinearColor(0.55f, 0.15f, 1.f), 450.f);

	EngineAudio = CreateDefaultSubobject<UAudioComponent>(TEXT("EngineAudio"));
	EngineAudio->SetupAttachment(GetMesh());
	EngineAudio->bAutoActivate = false;

	GetMesh()->SetNotifyRigidBodyCollision(true);

	PaintColorParameters = { TEXT("Paint Color"), TEXT("PaintColor"), TEXT("Body Color"), TEXT("BodyColor"), TEXT("Base Color"), TEXT("BaseColor"), TEXT("Color"), TEXT("Paint Tint"), TEXT("Tint") };
	PaintMaterialKeywords = { TEXT("Paint"), TEXT("Body"), TEXT("Carpaint"), TEXT("Car_Paint") };
}

void ABoostedVehicle::BeginPlay()
{
	Super::BeginPlay();
	CachePaintMaterials();
	if (Upgrades.Plate.IsEmpty())
	{
		Upgrades.Plate = BoostedEconomy::RandomPlate();
	}
	// physics wheels exist after the first tick; apply tuning then
	TWeakObjectPtr<ABoostedVehicle> WeakThis(this);
	GetWorldTimerManager().SetTimerForNextTick([WeakThis]()
	{
		if (ABoostedVehicle* Self = WeakThis.Get())
		{
			Self->ApplyUpgrades(Self->Upgrades);
		}
	});
	if (VehicleRole == EVehicleRole::Parked)
	{
		SetParked(true);
	}
}

UChaosWheeledVehicleMovementComponent* ABoostedVehicle::GetChaos() const
{
	return Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent());
}

void ABoostedVehicle::CacheBaseTuning()
{
	UChaosWheeledVehicleMovementComponent* M = GetChaos();
	if (!M || bBaseCaptured || M->Wheels.Num() == 0)
	{
		return;
	}
	BaseTorque = M->EngineSetup.MaxTorque;
	BaseFriction.Reset();
	BaseBrake.Reset();
	for (UChaosVehicleWheel* Wheel : M->Wheels)
	{
		BaseFriction.Add(Wheel ? Wheel->FrictionForceMultiplier : 2.f);
		BaseBrake.Add(Wheel ? Wheel->MaxBrakeTorque : 1500.f);
	}
	bBaseCaptured = true;
}

void ABoostedVehicle::CachePaintMaterials()
{
	PaintMaterials.Reset();
	USkeletalMeshComponent* Body = GetMesh();
	if (!Body)
	{
		return;
	}
	const TArray<FName> SlotNames = Body->GetMaterialSlotNames();
	for (int32 i = 0; i < Body->GetNumMaterials(); ++i)
	{
		UMaterialInterface* Mat = Body->GetMaterial(i);
		const FString MatName = Mat ? Mat->GetName() : FString();
		const FString SlotName = SlotNames.IsValidIndex(i) ? SlotNames[i].ToString() : FString();
		bool bMatch = PaintMaterialSlots.Contains(i);
		for (const FString& Word : PaintMaterialKeywords)
		{
			if (!Word.IsEmpty() && (MatName.Contains(Word) || SlotName.Contains(Word)))
			{
				bMatch = true;
			}
		}
		if (bMatch)
		{
			if (UMaterialInstanceDynamic* MID = Body->CreateAndSetMaterialInstanceDynamic(i))
			{
				PaintMaterials.Add(MID);
			}
		}
	}
}

void ABoostedVehicle::ApplyPaint()
{
	static const float Metallic[] = { 0.f, 0.65f, 0.05f, 0.35f, 1.f };
	static const float Roughness[] = { 0.25f, 0.32f, 0.78f, 0.25f, 0.06f };
	static const float ClearCoat[] = { 1.f, 1.f, 0.f, 1.f, 0.5f };
	const int32 F = FMath::Clamp(static_cast<int32>(Upgrades.Finish), 0, 4);
	for (UMaterialInstanceDynamic* MID : PaintMaterials)
	{
		if (!MID)
		{
			continue;
		}
		for (const FName& Param : PaintColorParameters)
		{
			MID->SetVectorParameterValue(Param, Upgrades.Paint);
		}
		MID->SetScalarParameterValue(TEXT("Metallic"), Metallic[F]);
		MID->SetScalarParameterValue(TEXT("Metalness"), Metallic[F]);
		MID->SetScalarParameterValue(TEXT("Roughness"), Roughness[F]);
		MID->SetScalarParameterValue(TEXT("ClearCoat"), ClearCoat[F]);
		MID->SetScalarParameterValue(TEXT("Clearcoat"), ClearCoat[F]);
	}
}

void ABoostedVehicle::ApplyUpgrades(const FCarUpgrades& NewUpgrades)
{
	Upgrades = NewUpgrades;
	CacheBaseTuning();
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		if (bBaseCaptured)
		{
			const FBoostedCarModel* Model = UBoostedSettings::Get()->FindCar(ModelId);
			const float Perf = Model ? Model->PerformanceScale : 1.f;
			const float Torque = BaseTorque * Perf * (1.f + 0.13f * Upgrades.Engine) * (Upgrades.Blower > 0 ? 1.18f : 1.f);
			M->SetMaxEngineTorque(Torque);
			for (int32 i = 0; i < BaseFriction.Num(); ++i)
			{
				M->SetWheelFrictionMultiplier(i, BaseFriction[i] * (1.f + 0.1f * Upgrades.Tires + 0.04f * Upgrades.Suspension));
				M->SetWheelMaxBrakeTorque(i, BaseBrake[i] * (1.f + 0.2f * Upgrades.Brakes));
			}
		}
	}
	ApplyPaint();
	if (UnderglowLight)
	{
		UnderglowLight->SetLightColor(Upgrades.UnderglowColor);
		UnderglowLight->SetIntensity(Upgrades.bUnderglow ? 60.f : 0.f);
	}
	OnUpgradesApplied();
}

// ---------------------------------------------------------------------- input

void ABoostedVehicle::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	UBoostedGameInstance* GI = GetGameInstance<UBoostedGameInstance>();
	if (!EIC || !GI)
	{
		return;
	}
	const UBoostedInputConfig* In = GI->GetInputConfig();
	EIC->BindAction(In->Throttle, ETriggerEvent::Triggered, this, &ABoostedVehicle::OnThrottle);
	EIC->BindAction(In->Throttle, ETriggerEvent::Completed, this, &ABoostedVehicle::OnThrottle);
	EIC->BindAction(In->Brake, ETriggerEvent::Triggered, this, &ABoostedVehicle::OnBrake);
	EIC->BindAction(In->Brake, ETriggerEvent::Completed, this, &ABoostedVehicle::OnBrake);
	EIC->BindAction(In->Steer, ETriggerEvent::Triggered, this, &ABoostedVehicle::OnSteer);
	EIC->BindAction(In->Steer, ETriggerEvent::Completed, this, &ABoostedVehicle::OnSteer);
	EIC->BindAction(In->Handbrake, ETriggerEvent::Started, this, &ABoostedVehicle::OnHandbrakeStart);
	EIC->BindAction(In->Handbrake, ETriggerEvent::Completed, this, &ABoostedVehicle::OnHandbrakeStop);
	EIC->BindAction(In->Nitro, ETriggerEvent::Started, this, &ABoostedVehicle::OnNitroStart);
	EIC->BindAction(In->Nitro, ETriggerEvent::Completed, this, &ABoostedVehicle::OnNitroStop);
	EIC->BindAction(In->Interact, ETriggerEvent::Started, this, &ABoostedVehicle::OnInteract);
	EIC->BindAction(In->Look, ETriggerEvent::Triggered, this, &ABoostedVehicle::OnLook);
	EIC->BindAction(In->Horn, ETriggerEvent::Started, this, &ABoostedVehicle::OnHorn);
}

void ABoostedVehicle::OnThrottle(const FInputActionValue& Value)
{
	InputThrottle = IsWrecked() ? 0.f : Value.Get<float>();
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetThrottleInput(InputThrottle);
	}
}

void ABoostedVehicle::OnBrake(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetBrakeInput(Value.Get<float>());
	}
}

void ABoostedVehicle::OnSteer(const FInputActionValue& Value)
{
	InputSteer = Value.Get<float>();
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetSteeringInput(InputSteer);
	}
}

void ABoostedVehicle::OnHandbrakeStart(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetHandbrakeInput(true);
	}
}

void ABoostedVehicle::OnHandbrakeStop(const FInputActionValue& Value)
{
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetHandbrakeInput(false);
	}
}

void ABoostedVehicle::OnNitroStart(const FInputActionValue& Value)
{
	bNitroHeld = true;
}

void ABoostedVehicle::OnNitroStop(const FInputActionValue& Value)
{
	bNitroHeld = false;
}

void ABoostedVehicle::OnInteract(const FInputActionValue& Value)
{
	if (ABoostedPlayerController* PC = Cast<ABoostedPlayerController>(GetController()))
	{
		PC->ExitVehicle(false);
	}
}

void ABoostedVehicle::OnLook(const FInputActionValue& Value)
{
	const FVector2D V = Value.Get<FVector2D>();
	LookOffset.Yaw = FMath::Clamp(LookOffset.Yaw + V.X * 2.5f, -170.f, 170.f);
	LookOffset.Pitch = FMath::Clamp(LookOffset.Pitch + V.Y * 1.5f, -35.f, 25.f);
	if (!V.IsNearlyZero())
	{
		LookIdle = 0.f;
	}
}

void ABoostedVehicle::OnHorn(const FInputActionValue& Value)
{
	if (ABoostedGameMode* GM = GetWorld()->GetAuthGameMode<ABoostedGameMode>())
	{
		GM->OnHorn(this);
	}
}

void ABoostedVehicle::SetDriveInputs(float InThrottle, float InBrake, float InSteer, bool bInHandbrake)
{
	UChaosWheeledVehicleMovementComponent* M = GetChaos();
	if (!M)
	{
		return;
	}
	InputThrottle = IsWrecked() ? 0.f : InThrottle;
	InputSteer = InSteer;
	M->SetThrottleInput(InputThrottle);
	M->SetBrakeInput(InBrake);
	M->SetSteeringInput(InSteer);
	M->SetHandbrakeInput(bInHandbrake);
}

void ABoostedVehicle::SetParked(bool bParked)
{
	if (UChaosWheeledVehicleMovementComponent* M = GetChaos())
	{
		M->SetThrottleInput(0.f);
		M->SetSteeringInput(0.f);
		M->SetBrakeInput(bParked ? 1.f : 0.f);
		M->SetHandbrakeInput(bParked);
	}
	InputThrottle = 0.f;
	bNitroHeld = false;
}

void ABoostedVehicle::TriggerAlarm(float Seconds)
{
	AlarmTimer = Seconds;
}

void ABoostedVehicle::PossessedBy(AController* NewController)
{
	Super::PossessedBy(NewController);
	SetParked(false);
	if (EngineAudio && EngineAudio->Sound)
	{
		EngineAudio->Play();
	}
}

void ABoostedVehicle::UnPossessed()
{
	Super::UnPossessed();
	SetParked(true);
	bNitroActive = false;
	if (EngineAudio)
	{
		EngineAudio->Stop();
	}
}

bool ABoostedVehicle::HasAIDriver() const
{
	return Cast<AAIController>(GetController()) != nullptr;
}

// ---------------------------------------------------------------------- per frame

void ABoostedVehicle::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// nitrous: straight forward push while held
	const bool bPlayer = VehicleRole == EVehicleRole::Player;
	bNitroActive = bPlayer && bNitroHeld && Upgrades.Nitro > 0 && NitroFuel > 0.f && !IsWrecked() && GetForwardSpeedMS() > -1.f;
	if (bNitroActive)
	{
		NitroFuel = FMath::Max(0.f, NitroFuel - DeltaSeconds / (2.5f + Upgrades.Nitro));
		GetMesh()->AddForce(GetActorForwardVector() * NitroAccel * Upgrades.Nitro, NAME_None, true);
	}
	else
	{
		NitroFuel = FMath::Min(1.f, NitroFuel + DeltaSeconds * 0.06f);
	}

	// chase camera free-look that drifts back behind the car
	LookIdle += DeltaSeconds;
	if (LookIdle > 1.5f)
	{
		LookOffset = FMath::RInterpTo(LookOffset, FRotator::ZeroRotator, DeltaSeconds, 2.5f);
	}
	const bool bReversing = GetForwardSpeedMS() < -2.f && LookIdle > 1.5f;
	SpringArm->SetRelativeRotation(FRotator(-12.f + LookOffset.Pitch, LookOffset.Yaw + (bReversing ? 180.f : 0.f), 0.f));
	if (Camera)
	{
		const float Speed = FMath::Abs(GetForwardSpeedMS());
		const float TargetFov = 85.f + FMath::Clamp(Speed / 70.f, 0.f, 1.f) * 12.f + (bNitroActive ? 8.f : 0.f);
		Camera->SetFieldOfView(FMath::FInterpTo(Camera->FieldOfView, TargetFov, DeltaSeconds, 3.f));
	}

	// police lights / car alarm flashing
	SirenTimer += DeltaSeconds;
	const bool bFlashA = FMath::Fmod(SirenTimer, 0.3f) < 0.15f;
	if (bSirenOn)
	{
		SirenRed->SetIntensity(bFlashA ? 900.f : 0.f);
		SirenBlue->SetIntensity(bFlashA ? 0.f : 900.f);
	}
	else if (AlarmTimer > 0.f)
	{
		AlarmTimer -= DeltaSeconds;
		const bool bOn = FMath::Fmod(SirenTimer, 0.5f) < 0.25f && AlarmTimer > 0.f;
		SirenRed->SetIntensity(0.f);
		SirenBlue->SetIntensity(bOn ? 150.f : 0.f);
		SirenBlue->SetLightColor(bOn ? FLinearColor(1.f, 0.85f, 0.6f) : FLinearColor(0.1f, 0.25f, 1.f));
	}
	else
	{
		SirenRed->SetIntensity(0.f);
		SirenBlue->SetIntensity(0.f);
	}

	if (EngineAudio && EngineAudio->IsPlaying())
	{
		EngineAudio->SetFloatParameter(TEXT("RPM"), GetRPM());
		EngineAudio->SetFloatParameter(TEXT("Throttle"), InputThrottle);
	}
}

void ABoostedVehicle::NotifyHit(UPrimitiveComponent* MyComp, AActor* Other, UPrimitiveComponent* OtherComp, bool bSelfMoved, FVector HitLocation, FVector HitNormal, FVector NormalImpulse, const FHitResult& Hit)
{
	Super::NotifyHit(MyComp, Other, OtherComp, bSelfMoved, HitLocation, HitNormal, NormalImpulse, Hit);
	const float Mass = FMath::Max(1.f, GetMesh()->GetMass());
	const float ImpactMS = NormalImpulse.Size() / Mass / 100.f;
	const float Now = GetWorld()->GetTimeSeconds();
	if (ImpactMS < DamageThreshold || Now - LastImpactTime < 0.25f)
	{
		return;
	}
	LastImpactTime = Now;
	const float Armor = 1.f - 0.2f * Upgrades.Armor;
	Health = FMath::Max(0.f, Health - (ImpactMS - DamageThreshold) / 60.f * Armor);
	if (ImpactMS > 9.f)
	{
		OnHeavyImpact(ImpactMS, HitLocation);
	}
	if (ABoostedGameMode* GM = GetWorld()->GetAuthGameMode<ABoostedGameMode>())
	{
		GM->OnVehicleImpact(this, Other, ImpactMS);
	}
}

// ---------------------------------------------------------------------- queries

float ABoostedVehicle::GetForwardSpeedMS() const
{
	const UChaosWheeledVehicleMovementComponent* M = GetChaos();
	return M ? M->GetForwardSpeed() / 100.f : 0.f;
}

float ABoostedVehicle::GetSpeedMPH() const
{
	return FMath::Abs(GetForwardSpeedMS()) * 2.237f;
}

int32 ABoostedVehicle::GetGear() const
{
	const UChaosWheeledVehicleMovementComponent* M = GetChaos();
	return M ? M->GetCurrentGear() : 0;
}

float ABoostedVehicle::GetRPM() const
{
	const UChaosWheeledVehicleMovementComponent* M = GetChaos();
	return M ? M->GetEngineRotationSpeed() : 0.f;
}

FString ABoostedVehicle::GetDisplayName() const
{
	return UBoostedGameInstance::CarName(ModelId);
}

float ABoostedVehicle::GetHalfLength() const
{
	FVector Origin, Extent;
	GetActorBounds(true, Origin, Extent);
	return FMath::Max(Extent.X, Extent.Y);
}

FVector ABoostedVehicle::GetDoorLocation() const
{
	FVector Origin, Extent;
	GetActorBounds(true, Origin, Extent);
	const float HalfWidth = FMath::Min(Extent.X, Extent.Y);
	// driver's side is the car's left (-Y in Unreal's left-handed space)
	return GetActorLocation() - GetActorRightVector() * (HalfWidth + 70.f) + GetActorForwardVector() * 30.f;
}
