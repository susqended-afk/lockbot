#include "BoostedLocation.h"
#include "BoostedPlayerController.h"
#include "BoostedVehicle.h"
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"
#include "UObject/ConstructorHelpers.h"

ABoostedLocation::ABoostedLocation()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickInterval = 0.1f;

	USceneComponent* SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = SceneRoot;

	Pad = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Pad"));
	Pad->SetupAttachment(SceneRoot);
	Pad->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Pad->SetCastShadow(false);
	static ConstructorHelpers::FObjectFinder<UStaticMesh> Cylinder(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (Cylinder.Succeeded())
	{
		Pad->SetStaticMesh(Cylinder.Object);
	}

	Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("Glow"));
	Glow->SetupAttachment(SceneRoot);
	Glow->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Glow->SetIntensityUnits(ELightUnits::Candelas);
	Glow->SetIntensity(120.f);
	Glow->SetAttenuationRadius(900.f);
	Glow->SetCastShadows(false);

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(SceneRoot);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 420.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetVerticalAlignment(EVRTA_TextCenter);
	Label->SetWorldSize(110.f);
}

FString ABoostedLocation::NameFor(EBoostedLocationType InType)
{
	switch (InType)
	{
	case EBoostedLocationType::Garage: return TEXT("The Spot");
	case EBoostedLocationType::ChopShop: return TEXT("EZ Auto Parts");
	case EBoostedLocationType::Exports: return TEXT("Port Exports");
	case EBoostedLocationType::BodyShop: return TEXT("Fresh Coat");
	case EBoostedLocationType::PoliceStation: return TEXT("Police");
	}
	return FString();
}

FLinearColor ABoostedLocation::ColorFor(EBoostedLocationType InType)
{
	switch (InType)
	{
	case EBoostedLocationType::Garage: return FLinearColor(0.1f, 0.65f, 1.f);
	case EBoostedLocationType::ChopShop: return FLinearColor(1.f, 0.55f, 0.f);
	case EBoostedLocationType::Exports: return FLinearColor(0.15f, 1.f, 0.45f);
	case EBoostedLocationType::BodyShop: return FLinearColor(1.f, 0.25f, 0.75f);
	case EBoostedLocationType::PoliceStation: return FLinearColor(0.2f, 0.4f, 1.f);
	}
	return FLinearColor::White;
}

FString ABoostedLocation::GetDisplayName() const
{
	return NameFor(Type);
}

FLinearColor ABoostedLocation::GetColor() const
{
	return ColorFor(Type);
}

void ABoostedLocation::Setup(EBoostedLocationType InType)
{
	Type = InType;
	bPassive = InType == EBoostedLocationType::PoliceStation;
	const FLinearColor Color = GetColor();
	Pad->SetRelativeScale3D(FVector(Radius * 2.f / 100.f, Radius * 2.f / 100.f, 0.04f));
	Pad->SetRelativeLocation(FVector(0.f, 0.f, 18.f));
	if (UMaterialInstanceDynamic* MID = Pad->CreateAndSetMaterialInstanceDynamic(0))
	{
		MID->SetVectorParameterValue(TEXT("Color"), Color);
	}
	Pad->SetVisibility(!bPassive);
	Glow->SetLightColor(Color);
	Glow->SetVisibility(!bPassive);
	Label->SetText(FText::FromString(GetDisplayName().ToUpper()));
	Label->SetTextRenderColor(Color.ToFColor(true));
}

void ABoostedLocation::BeginPlay()
{
	Super::BeginPlay();
	Setup(Type);
}

void ABoostedLocation::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// keep the label facing the camera
	if (APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0))
	{
		const FVector ToCam = Cam->GetCameraLocation() - Label->GetComponentLocation();
		Label->SetWorldRotation(FRotator(0.f, ToCam.Rotation().Yaw, 0.f));
	}
	if (bPassive)
	{
		return;
	}

	ABoostedPlayerController* PC = Cast<ABoostedPlayerController>(UGameplayStatics::GetPlayerController(this, 0));
	APawn* Pawn = PC ? PC->GetPawn() : nullptr;
	if (!Pawn)
	{
		return;
	}
	const float Dist = FVector::Dist2D(Pawn->GetActorLocation(), GetActorLocation());
	if (Dist > Radius + 300.f)
	{
		bArmed = true;
		return;
	}
	if (!bArmed || Dist > Radius || PC->IsMenuOpen())
	{
		return;
	}
	const ABoostedVehicle* V = Cast<ABoostedVehicle>(Pawn);
	if (V && FMath::Abs(V->GetForwardSpeedMS()) > 3.f)
	{
		return;
	}
	bArmed = false;
	PC->OnEnterLocation(this);
}
