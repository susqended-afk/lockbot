#include "BoostedCity.h"
#include "BoostedLocation.h"
#include "BoostedSettings.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
	// rows = BY (Y grows "south"), cols = BX.  I industrial  C commercial  D downtown  H houses  A apartments
	// P park  L parking lot  G your garage  X chop shop  E docks/exports  S body shop  O police  F gas station
	const TCHAR* Layout[ABoostedCity::N] = {
		TEXT("IIXICDDD"),
		TEXT("IIICCDDD"),
		TEXT("HHCLCCDD"),
		TEXT("HGHCPCOC"),
		TEXT("HHHCCLCA"),
		TEXT("AASCHHCA"),
		TEXT("AACFHHCA"),
		TEXT("EECCCHHC"),
	};

	const FLinearColor Palettes[6] = {
		FLinearColor(0.30f, 0.10f, 0.07f), // brick
		FLinearColor(0.50f, 0.42f, 0.30f), // beige stucco
		FLinearColor(0.33f, 0.33f, 0.35f), // concrete
		FLinearColor(0.05f, 0.08f, 0.12f), // glass tower
		FLinearColor(0.70f, 0.68f, 0.62f), // white siding
		FLinearColor(0.22f, 0.25f, 0.24f), // warehouse metal
	};

	FBox2D Inset(const FBox2D& R, float D)
	{
		return FBox2D(R.Min + FVector2D(D, D), R.Max - FVector2D(D, D));
	}

	FBox2D SubX(const FBox2D& R, float X0, float X1)
	{
		return FBox2D(FVector2D(X0, R.Min.Y), FVector2D(X1, R.Max.Y));
	}
}

ABoostedCity::ABoostedCity()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = SceneRoot;

	static ConstructorHelpers::FObjectFinder<UMaterialInterface> BasicMat(TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	if (BasicMat.Succeeded())
	{
		BaseMaterial = BasicMat.Object;
	}
	const TCHAR* Cube = TEXT("/Engine/BasicShapes/Cube.Cube");
	const TCHAR* Cylinder = TEXT("/Engine/BasicShapes/Cylinder.Cylinder");
	const TCHAR* Sphere = TEXT("/Engine/BasicShapes/Sphere.Sphere");

	Ground = MakeISM(TEXT("Ground"), Cube, true, false);
	Water = MakeISM(TEXT("Water"), Cube, false, false);
	Sidewalk = MakeISM(TEXT("Sidewalk"), Cube, true);
	Grass = MakeISM(TEXT("Grass"), Cube, false, false);
	Lot = MakeISM(TEXT("Lot"), Cube, false, false);
	LineWhite = MakeISM(TEXT("LineWhite"), Cube, false, false);
	LineYellow = MakeISM(TEXT("LineYellow"), Cube, false, false);
	Roof = MakeISM(TEXT("Roof"), Cube, true);
	Trim = MakeISM(TEXT("Trim"), Cube, true);
	Accent = MakeISM(TEXT("Accent"), Cube, true);
	Metal = MakeISM(TEXT("Metal"), Cube, true);
	Trunk = MakeISM(TEXT("Trunk"), Cylinder, true);
	Leaves = MakeISM(TEXT("Leaves"), Sphere, false);
	Poles = MakeISM(TEXT("Poles"), Cylinder, true);
	Lamps = MakeISM(TEXT("Lamps"), Cube, false, false);
	for (int32 i = 0; i < 6; ++i)
	{
		Buildings.Add(MakeISM(*FString::Printf(TEXT("Buildings%d"), i), Cube, true));
	}
}

UInstancedStaticMeshComponent* ABoostedCity::MakeISM(const TCHAR* Name, const TCHAR* MeshPath, bool bCollision, bool bShadows)
{
	UInstancedStaticMeshComponent* ISM = CreateDefaultSubobject<UInstancedStaticMeshComponent>(Name);
	ISM->SetupAttachment(SceneRoot);
	ConstructorHelpers::FObjectFinder<UStaticMesh> Mesh(MeshPath);
	if (Mesh.Succeeded())
	{
		ISM->SetStaticMesh(Mesh.Object);
	}
	ISM->SetCollisionEnabled(bCollision ? ECollisionEnabled::QueryAndPhysics : ECollisionEnabled::NoCollision);
	if (bCollision)
	{
		ISM->SetCollisionProfileName(TEXT("BlockAll"));
	}
	ISM->SetCastShadow(bShadows);
	return ISM;
}

void ABoostedCity::Paint(UInstancedStaticMeshComponent* ISM, const FLinearColor& Color, UMaterialInterface* Override)
{
	if (Override)
	{
		ISM->SetMaterial(0, Override);
		return;
	}
	if (BaseMaterial)
	{
		UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
		MID->SetVectorParameterValue(TEXT("Color"), Color);
		ISM->SetMaterial(0, MID);
	}
}

void ABoostedCity::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);
	Generate();
}

void ABoostedCity::BeginPlay()
{
	Super::BeginPlay();
	Generate(); // rebuild runtime data (spots, locations) deterministically

	UWorld* World = GetWorld();
	SpawnLightingIfNeeded();
	for (const FCityLocationSpec& Spec : LocationSpecs)
	{
		const FTransform T(FRotator(0.f, Spec.Yaw, 0.f), Spec.Local);
		const FTransform W = T * GetActorTransform();
		FActorSpawnParameters P;
		P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		if (ABoostedLocation* Loc = World->SpawnActor<ABoostedLocation>(ABoostedLocation::StaticClass(), W, P))
		{
			Loc->Setup(Spec.Type);
			Locations.Add(Loc);
		}
	}
	SpawnKitBuildings();
	SetActorTickEnabled(Sun.IsValid() && UBoostedSettings::Get()->DayNightSpeed > 0.f);
}

void ABoostedCity::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (ADirectionalLight* SunActor = Sun.Get())
	{
		// a full turn every 24 minutes at speed 1
		SunActor->AddActorLocalRotation(FRotator(-0.25f * UBoostedSettings::Get()->DayNightSpeed * DeltaSeconds, 0.f, 0.f));
	}
}

ABoostedCity* ABoostedCity::Get(UWorld* World)
{
	if (!World)
	{
		return nullptr;
	}
	for (TActorIterator<ABoostedCity> It(World); It; ++It)
	{
		return *It;
	}
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	return World->SpawnActor<ABoostedCity>(ABoostedCity::StaticClass(), FTransform::Identity, P);
}

// ---------------------------------------------------------------------- queries

FVector ABoostedCity::NodeLocation(int32 I, int32 J) const
{
	return GetActorTransform().TransformPosition(FVector(RoadCoord(I), RoadCoord(J), 0.f));
}

FIntPoint ABoostedCity::NearestNode(const FVector& WorldLocation) const
{
	const FVector L = GetActorTransform().InverseTransformPosition(WorldLocation);
	return FIntPoint(
		FMath::Clamp(FMath::RoundToInt(L.X / Pitch() + N / 2), 0, N),
		FMath::Clamp(FMath::RoundToInt(L.Y / Pitch() + N / 2), 0, N));
}

FTransform ABoostedCity::GetPlayerSpawn() const
{
	return SpawnLocal * GetActorTransform();
}

ABoostedLocation* ABoostedCity::FindLocation(EBoostedLocationType Type) const
{
	for (ABoostedLocation* Loc : Locations)
	{
		if (Loc && Loc->Type == Type)
		{
			return Loc;
		}
	}
	return nullptr;
}

TArray<FVector> ABoostedCity::SidewalkLoop(int32 BlockIndex) const
{
	TArray<FVector> Out;
	if (!Blocks.IsValidIndex(BlockIndex))
	{
		return Out;
	}
	const FBox2D R = Inset(Blocks[BlockIndex].Rect, 170.f);
	const FVector2D Corners[4] = { R.Min, FVector2D(R.Max.X, R.Min.Y), R.Max, FVector2D(R.Min.X, R.Max.Y) };
	for (const FVector2D& C : Corners)
	{
		Out.Add(GetActorTransform().TransformPosition(FVector(C.X, C.Y, Curb + 100.f)));
	}
	return Out;
}

// ---------------------------------------------------------------------- helpers

void ABoostedCity::Box(UInstancedStaticMeshComponent* ISM, float X0, float X1, float Y0, float Y1, float Z0, float Z1)
{
	const FVector Center((X0 + X1) * 0.5f, (Y0 + Y1) * 0.5f, (Z0 + Z1) * 0.5f);
	const FVector Scale(FMath::Abs(X1 - X0) / 100.f, FMath::Abs(Y1 - Y0) / 100.f, FMath::Abs(Z1 - Z0) / 100.f);
	ISM->AddInstance(FTransform(FRotator::ZeroRotator, Center, Scale));
}

void ABoostedCity::Cyl(UInstancedStaticMeshComponent* ISM, float X, float Y, float Z0, float Z1, float Radius)
{
	ISM->AddInstance(FTransform(FRotator::ZeroRotator, FVector(X, Y, (Z0 + Z1) * 0.5f), FVector(Radius / 50.f, Radius / 50.f, (Z1 - Z0) / 100.f)));
}

void ABoostedCity::Building(ECityKit Kit, int32 PaletteIndex, float X0, float X1, float Y0, float Y1, float Height, float FrontYaw)
{
	const TArray<TObjectPtr<UStaticMesh>>* KitList = nullptr;
	switch (Kit)
	{
	case ECityKit::House: KitList = &HouseMeshes; break;
	case ECityKit::Shop: KitList = &ShopMeshes; break;
	case ECityKit::Apartment: KitList = &ApartmentMeshes; break;
	case ECityKit::Tower: KitList = &TowerMeshes; break;
	case ECityKit::Warehouse: KitList = &WarehouseMeshes; break;
	}
	if (KitList && KitList->Num() > 0)
	{
		FCityKitLot L;
		L.Kit = Kit;
		L.Rect = FBox2D(FVector2D(FMath::Min(X0, X1), FMath::Min(Y0, Y1)), FVector2D(FMath::Max(X0, X1), FMath::Max(Y0, Y1)));
		L.Height = Height;
		L.Yaw = FrontYaw;
		KitLots.Add(L);
		return;
	}
	Box(Buildings[FMath::Clamp(PaletteIndex, 0, Buildings.Num() - 1)], X0, X1, Y0, Y1, Curb, Curb + Height);
	if (Height > 600.f && Kit != ECityKit::House)
	{
		// roof cap + parapet look
		Box(Roof, X0 + 40.f, X1 - 40.f, Y0 + 40.f, Y1 - 40.f, Curb + Height, Curb + Height + 60.f);
	}
}

void ABoostedCity::GableRoof(float X0, float X1, float Y0, float Y1, float Z)
{
	const bool bAlongX = (X1 - X0) >= (Y1 - Y0);
	const float Span = bAlongX ? (Y1 - Y0) : (X1 - X0);
	const float Side = Span * 0.5f * UE_SQRT_2;
	const FVector Center((X0 + X1) * 0.5f, (Y0 + Y1) * 0.5f, Z);
	if (bAlongX)
	{
		Roof->AddInstance(FTransform(FRotator(0.f, 0.f, 45.f), Center, FVector((X1 - X0) / 100.f, Side / 100.f, Side / 100.f)));
	}
	else
	{
		Roof->AddInstance(FTransform(FRotator(45.f, 0.f, 0.f), Center, FVector(Side / 100.f, (Y1 - Y0) / 100.f, Side / 100.f)));
	}
}

void ABoostedCity::Tree(float X, float Y, float Scale)
{
	Cyl(Trunk, X, Y, Curb, Curb + 320.f * Scale, 14.f * Scale);
	Leaves->AddInstance(FTransform(FRotator(0.f, Rng.FRandRange(0.f, 360.f), 0.f), FVector(X, Y, Curb + 400.f * Scale),
		FVector(3.6f, 3.6f, 3.1f) * Scale * Rng.FRandRange(0.85f, 1.2f)));
}

void ABoostedCity::Spot(float X, float Y, float Yaw, bool bPolice)
{
	FParkingSpot S;
	S.Location = GetActorTransform().TransformPosition(FVector(X, Y, Curb + 60.f));
	S.Yaw = Yaw + GetActorRotation().Yaw;
	S.bPolice = bPolice;
	ParkingSpots.Add(S);
}

void ABoostedCity::AddLocation(EBoostedLocationType Type, float X, float Y, float Yaw)
{
	FCityLocationSpec Spec;
	Spec.Type = Type;
	Spec.Local = FVector(X, Y, Curb);
	Spec.Yaw = Yaw;
	LocationSpecs.Add(Spec);
}

// ---------------------------------------------------------------------- generation

void ABoostedCity::ClearAll()
{
	for (UInstancedStaticMeshComponent* ISM : { Ground.Get(), Water.Get(), Sidewalk.Get(), Grass.Get(), Lot.Get(), LineWhite.Get(), LineYellow.Get(),
		Roof.Get(), Trim.Get(), Accent.Get(), Metal.Get(), Trunk.Get(), Leaves.Get(), Poles.Get(), Lamps.Get() })
	{
		if (ISM)
		{
			ISM->ClearInstances();
		}
	}
	for (UInstancedStaticMeshComponent* ISM : Buildings)
	{
		if (ISM)
		{
			ISM->ClearInstances();
		}
	}
	Blocks.Reset();
	ParkingSpots.Reset();
	LocationSpecs.Reset();
	KitLots.Reset();
}

void ABoostedCity::Generate()
{
	ClearAll();
	Rng.Initialize(Seed);

	Paint(Ground, FLinearColor(0.025f, 0.025f, 0.03f), RoadMaterial);
	Paint(Water, FLinearColor(0.01f, 0.035f, 0.05f));
	Paint(Sidewalk, FLinearColor(0.3f, 0.29f, 0.28f), SidewalkMaterial);
	Paint(Grass, FLinearColor(0.045f, 0.11f, 0.03f), GrassMaterial);
	Paint(Lot, FLinearColor(0.04f, 0.04f, 0.045f), RoadMaterial);
	Paint(LineWhite, FLinearColor(0.8f, 0.8f, 0.78f));
	Paint(LineYellow, FLinearColor(0.9f, 0.55f, 0.04f));
	Paint(Roof, FLinearColor(0.05f, 0.05f, 0.055f));
	Paint(Trim, FLinearColor(0.02f, 0.022f, 0.026f));
	Paint(Accent, FLinearColor(0.55f, 0.04f, 0.04f));
	Paint(Metal, FLinearColor(0.25f, 0.27f, 0.3f));
	Paint(Trunk, FLinearColor(0.11f, 0.07f, 0.04f));
	Paint(Leaves, FLinearColor(0.05f, 0.13f, 0.035f));
	Paint(Poles, FLinearColor(0.07f, 0.075f, 0.08f));
	Paint(Lamps, FLinearColor(1.f, 0.9f, 0.7f));
	for (int32 i = 0; i < Buildings.Num(); ++i)
	{
		Paint(Buildings[i], Palettes[i]);
	}

	const float Half = (N / 2) * Pitch();
	const float Edge = Half + RoadWidth * 0.5f;
	const float WaterY = Edge + 1400.f;
	Box(Ground, -60000.f, 60000.f, -60000.f, WaterY, -100.f, 0.f);
	Box(Sidewalk, -60000.f, 60000.f, WaterY - 60.f, WaterY, -170.f, 2.f);
	Box(Water, -60000.f, 60000.f, WaterY, WaterY + 60000.f, -240.f, -130.f);

	for (int32 BY = 0; BY < N; ++BY)
	{
		for (int32 BX = 0; BX < N; ++BX)
		{
			FCityBlock B;
			B.BX = BX;
			B.BY = BY;
			B.Type = Layout[BY][BX];
			B.Rect = FBox2D(
				FVector2D(RoadCoord(BX) + RoadWidth * 0.5f, RoadCoord(BY) + RoadWidth * 0.5f),
				FVector2D(RoadCoord(BX + 1) - RoadWidth * 0.5f, RoadCoord(BY + 1) - RoadWidth * 0.5f));
			Blocks.Add(B);
			Box(Sidewalk, B.Rect.Min.X, B.Rect.Max.X, B.Rect.Min.Y, B.Rect.Max.Y, -20.f, Curb);
			BuildBlock(B);
		}
	}
	RoadMarkings();
	StreetLights();
	Perimeter();
}

void ABoostedCity::BuildBlock(const FCityBlock& B)
{
	const FBox2D R = Inset(B.Rect, SidewalkWidth);
	switch (B.Type)
	{
	case 'H': Houses(R, true); break;
	case 'C': Commercial(R); break;
	case 'D': Downtown(R); break;
	case 'A': Apartments(R); break;
	case 'I': Industrial(R); break;
	case 'P': Park(R); break;
	case 'L': ParkingLot(R); break;
	case 'E': Docks(B); break;
	case 'G': HomeGarage(R); break;
	case 'X': ChopShop(R); break;
	case 'S': BodyShop(R); break;
	case 'O': PoliceStation(R); break;
	case 'F': GasStation(R); break;
	default: break;
	}
	// street trees on residential & commercial blocks
	if (B.Type == 'H' || B.Type == 'A' || B.Type == 'C' || B.Type == 'P')
	{
		for (float X = B.Rect.Min.X + 800.f; X < B.Rect.Max.X - 600.f; X += Rng.FRandRange(1400.f, 2000.f))
		{
			if (Rng.FRand() < 0.6f) Tree(X, B.Rect.Min.Y + 130.f, 0.85f);
			if (Rng.FRand() < 0.6f) Tree(X, B.Rect.Max.Y - 130.f, 0.85f);
		}
	}
}

void ABoostedCity::Houses(const FBox2D& R, bool bTrees)
{
	Box(Grass, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const float Width = R.Max.X - R.Min.X;
	const int32 PerRow = FMath::Max(1, FMath::RoundToInt(Width / 1425.f));
	const float LotW = Width / PerRow;
	const int32 HousePalettes[3] = { 4, 1, 0 };
	for (int32 Row = 0; Row < 2; ++Row)
	{
		const bool bTop = Row == 0; // top row faces the street at Min.Y
		for (int32 i = 0; i < PerRow; ++i)
		{
			const float LX0 = R.Min.X + i * LotW;
			const float CX = LX0 + LotW * 0.5f + Rng.FRandRange(-40.f, 40.f);
			const float W = FMath::Min(800.f + Rng.FRand() * 150.f, LotW - 480.f);
			const float D = 950.f + Rng.FRand() * 200.f;
			const float Front = bTop ? R.Min.Y + 700.f : R.Max.Y - 700.f;
			const float Y0 = bTop ? Front : Front - D;
			const float Y1 = bTop ? Front + D : Front;
			const float X0 = CX - W * 0.5f - 120.f;
			const float X1 = X0 + W;
			const float H = Rng.FRand() < 0.35f ? 660.f : 330.f;
			Building(ECityKit::House, HousePalettes[Rng.RandRange(0, 2)], X0, X1, Y0, Y1, H, bTop ? -90.f : 90.f);
			if (HouseMeshes.Num() == 0)
			{
				GableRoof(X0 - 30.f, X1 + 30.f, Y0 - 30.f, Y1 + 30.f, Curb + H);
				// porch + front door
				const float FY = bTop ? Y0 : Y1;
				const float Dir = bTop ? -1.f : 1.f;
				const float PX = (X0 + X1) * 0.5f - 120.f;
				Box(Sidewalk, PX - 160.f, PX + 160.f, FMath::Min(FY, FY + Dir * 180.f), FMath::Max(FY, FY + Dir * 180.f), Curb, Curb + 40.f);
				Box(Trim, PX - 55.f, PX + 55.f, FMath::Min(FY, FY + Dir * 6.f), FMath::Max(FY, FY + Dir * 6.f), Curb + 40.f, Curb + 250.f);
			}
			// driveway with a parking spot near the street
			const float DX = X1 + 180.f;
			const float DY0 = bTop ? R.Min.Y - SidewalkWidth : Y1 - 400.f;
			const float DY1 = bTop ? Y0 + 400.f : R.Max.Y + SidewalkWidth;
			Box(Sidewalk, DX - 160.f, DX + 160.f, DY0, DY1, Curb, Curb + 2.f);
			Spot(DX, bTop ? R.Min.Y + 280.f : R.Max.Y - 280.f, bTop ? 90.f : -90.f);
		}
	}
	if (bTrees)
	{
		for (int32 i = 0; i < 3; ++i)
		{
			Tree(Rng.FRandRange(R.Min.X + 300.f, R.Max.X - 300.f), (R.Min.Y + R.Max.Y) * 0.5f + Rng.FRandRange(-500.f, 500.f), 1.1f);
		}
	}
}

void ABoostedCity::Commercial(const FBox2D& R)
{
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const float Depth = 1300.f;
	const int32 Open = Rng.RandRange(0, 1); // 0 = west open, 1 = east open (lot entrance)
	for (int32 Side = 0; Side < 4; ++Side)
	{
		// 0 = north (Min.Y), 1 = south (Max.Y), 2 = west (Min.X), 3 = east (Max.X)
		const bool bHoriz = Side < 2;
		if (!bHoriz && ((Side == 2 && Open == 0) || (Side == 3 && Open == 1) || Rng.FRand() < 0.4f))
		{
			continue;
		}
		const float A0 = bHoriz ? R.Min.X : R.Min.Y + Depth;
		const float A1 = bHoriz ? R.Max.X : R.Max.Y - Depth;
		float A = A0;
		while (A < A1 - 600.f)
		{
			const float W = FMath::Min(A1 - A, Rng.FRandRange(1000.f, 1800.f));
			const float H = Rng.FRand() < 0.45f ? 450.f : 450.f + 320.f * Rng.RandRange(1, 3);
			float X0, X1, Y0, Y1, Yaw;
			if (Side == 0) { X0 = A; X1 = A + W; Y0 = R.Min.Y; Y1 = R.Min.Y + Depth; Yaw = -90.f; }
			else if (Side == 1) { X0 = A; X1 = A + W; Y0 = R.Max.Y - Depth; Y1 = R.Max.Y; Yaw = 90.f; }
			else if (Side == 2) { X0 = R.Min.X; X1 = R.Min.X + Depth; Y0 = A; Y1 = A + W; Yaw = 180.f; }
			else { X0 = R.Max.X - Depth; X1 = R.Max.X; Y0 = A; Y1 = A + W; Yaw = 0.f; }
			Building(ECityKit::Shop, Rng.RandRange(0, 2), X0, X1, Y0, Y1, H, Yaw);
			if (ShopMeshes.Num() == 0)
			{
				// storefront glass, awning and sign board on the street face
				const float In = 60.f;
				if (Side == 0)
				{
					Box(Trim, X0 + In, X1 - In, Y0 - 4.f, Y0, Curb + 30.f, Curb + 300.f);
					Box(Accent, X0 + In, X1 - In, Y0 - 160.f, Y0, Curb + 300.f, Curb + 320.f);
					Box(Trim, X0 + In + 40.f, X1 - In - 40.f, Y0 - 12.f, Y0, Curb + 340.f, Curb + 430.f);
				}
				else if (Side == 1)
				{
					Box(Trim, X0 + In, X1 - In, Y1, Y1 + 4.f, Curb + 30.f, Curb + 300.f);
					Box(Accent, X0 + In, X1 - In, Y1, Y1 + 160.f, Curb + 300.f, Curb + 320.f);
					Box(Trim, X0 + In + 40.f, X1 - In - 40.f, Y1, Y1 + 12.f, Curb + 340.f, Curb + 430.f);
				}
				else if (Side == 2)
				{
					Box(Trim, X0 - 4.f, X0, Y0 + In, Y1 - In, Curb + 30.f, Curb + 300.f);
					Box(Accent, X0 - 160.f, X0, Y0 + In, Y1 - In, Curb + 300.f, Curb + 320.f);
				}
				else
				{
					Box(Trim, X1, X1 + 4.f, Y0 + In, Y1 - In, Curb + 30.f, Curb + 300.f);
					Box(Accent, X1, X1 + 160.f, Y0 + In, Y1 - In, Curb + 300.f, Curb + 320.f);
				}
			}
			A += W;
		}
	}
	// back lot parking + dumpsters
	const FVector2D C = R.GetCenter();
	for (int32 i = 0; i < 8; ++i)
	{
		Spot(C.X - 1200.f + i * 300.f, C.Y - 300.f, 90.f);
	}
	Box(Accent, C.X - 1100.f, C.X - 910.f, C.Y + 800.f, C.Y + 920.f, Curb, Curb + 130.f);
	Box(Accent, C.X + 910.f, C.X + 1100.f, C.Y + 800.f, C.Y + 920.f, Curb, Curb + 130.f);
}

void ABoostedCity::Downtown(const FBox2D& R)
{
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const int32 Split = Rng.FRand() < 0.5f ? 1 : 2;
	const float W = (R.Max.X - R.Min.X) / Split;
	const float D = (R.Max.Y - R.Min.Y) / Split;
	const float Pad = 250.f;
	for (int32 i = 0; i < Split; ++i)
	{
		for (int32 j = 0; j < Split; ++j)
		{
			const float X0 = R.Min.X + i * W + Pad, X1 = R.Min.X + (i + 1) * W - Pad;
			const float Y0 = R.Min.Y + j * D + Pad, Y1 = R.Min.Y + (j + 1) * D - Pad;
			const float H = Rng.FRandRange(3000.f, 10500.f);
			const int32 Pal = Rng.FRand() < 0.6f ? 3 : 2;
			Building(ECityKit::Tower, Pal, X0, X1, Y0, Y1, H, 0.f);
			if (TowerMeshes.Num() == 0 && H > 5000.f)
			{
				Box(Buildings[Pal], X0 + 400.f, X1 - 400.f, Y0 + 400.f, Y1 - 400.f, Curb + H, Curb + H + 800.f);
				Cyl(Poles, (X0 + X1) * 0.5f, (Y0 + Y1) * 0.5f, Curb + H + 800.f, Curb + H + 2200.f, 25.f);
			}
		}
	}
}

void ABoostedCity::Apartments(const FBox2D& R)
{
	Box(Grass, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const float H = Rng.RandRange(4, 7) * 320.f;
	const int32 Pal = Rng.FRand() < 0.6f ? 0 : 1;
	Building(ECityKit::Apartment, Pal, R.Min.X + 400.f, R.Max.X - 400.f, R.Min.Y + 200.f, R.Min.Y + 1600.f, H, -90.f);
	Building(ECityKit::Apartment, Pal, R.Min.X + 400.f, R.Max.X - 400.f, R.Max.Y - 1600.f, R.Max.Y - 200.f, H, 90.f);
	if (R.Max.X - R.Min.X < 4000.f)
	{
		return; // narrow lot (shared block): no courtyard extras
	}
	const FVector2D C = R.GetCenter();
	Box(Lot, C.X - 900.f, C.X + 900.f, C.Y - 700.f, C.Y + 700.f, Curb, Curb + 2.f);
	Cyl(Poles, C.X, C.Y - 690.f, Curb, Curb + 340.f, 8.f);
	Box(Sidewalk, C.X - 90.f, C.X + 90.f, C.Y - 640.f, C.Y - 630.f, Curb + 290.f, Curb + 395.f);
	for (int32 i = 0; i < 5; ++i)
	{
		Spot(R.Min.X + 420.f, C.Y - 600.f + i * 300.f, 0.f);
		Spot(R.Max.X - 420.f, C.Y - 600.f + i * 300.f, 180.f);
	}
}

void ABoostedCity::Industrial(const FBox2D& R)
{
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const float W = R.Max.X - R.Min.X;
	const int32 Count = (W > 5000.f && Rng.FRand() < 0.5f) ? 2 : 1;
	for (int32 i = 0; i < Count; ++i)
	{
		const float X0 = R.Min.X + 300.f + i * 2800.f;
		const float X1 = Count == 1 ? R.Max.X - (W > 4000.f ? 1200.f : 300.f) : X0 + 2400.f;
		const float Y0 = R.Min.Y + 400.f, Y1 = R.Max.Y - 1600.f;
		Building(ECityKit::Warehouse, 5, X0, X1, Y0, Y1, Rng.FRandRange(800.f, 1300.f), 90.f);
		if (WarehouseMeshes.Num() == 0)
		{
			const float DX = (X0 + X1) * 0.5f;
			Box(Metal, DX - 250.f, DX + 250.f, Y1, Y1 + 5.f, Curb, Curb + 420.f);
		}
	}
	const int32 Spots = FMath::Clamp(FMath::FloorToInt((W - 2000.f) / 320.f), 0, 4);
	for (int32 i = 0; i < Spots; ++i)
	{
		Spot(R.Min.X + 500.f + i * 320.f, R.Max.Y - 800.f, 90.f);
	}
}

void ABoostedCity::Park(const FBox2D& R)
{
	Box(Grass, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const FVector2D C = R.GetCenter();
	Box(Lot, C.X - 750.f, C.X + 750.f, C.Y - 1400.f, C.Y + 1400.f, Curb, Curb + 2.f);
	for (const float Dir : { -1.f, 1.f })
	{
		const float Y = C.Y + Dir * 1340.f;
		Cyl(Poles, C.X, Y + Dir * 60.f, Curb, Curb + 340.f, 8.f);
		Box(Sidewalk, C.X - 90.f, C.X + 90.f, Y - 5.f, Y + 5.f, Curb + 290.f, Curb + 395.f);
	}
	for (int32 i = 0; i < 16; ++i)
	{
		const float X = Rng.FRandRange(R.Min.X + 300.f, R.Max.X - 300.f);
		const float Y = Rng.FRandRange(R.Min.Y + 300.f, R.Max.Y - 300.f);
		if (FMath::Abs(X - C.X) < 1050.f && FMath::Abs(Y - C.Y) < 1700.f)
		{
			continue;
		}
		Tree(X, Y, 1.2f);
	}
}

void ABoostedCity::ParkingLot(const FBox2D& R)
{
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	for (int32 Row = 0; Row < 4; ++Row)
	{
		const float Y = R.Min.Y + 700.f + Row * 1400.f;
		for (int32 i = 0; i < 17; ++i)
		{
			const float X = R.Min.X + 500.f + i * 290.f;
			Spot(X, Y, Row % 2 ? -90.f : 90.f);
			Box(LineWhite, X + 140.f, X + 148.f, Y - 260.f, Y + 260.f, Curb + 1.5f, Curb + 2.5f);
		}
	}
	for (int32 i = 0; i < 4; ++i)
	{
		const float X = R.Min.X + 1000.f + i * 1300.f, Y = (R.Min.Y + R.Max.Y) * 0.5f;
		Cyl(Poles, X, Y, Curb, Curb + 900.f, 12.f);
		Box(Lamps, X - 80.f, X + 80.f, Y - 30.f, Y + 30.f, Curb + 890.f, Curb + 910.f);
	}
}

void ABoostedCity::Docks(const FCityBlock& B)
{
	const FBox2D R = Inset(B.Rect, SidewalkWidth);
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	for (int32 Row = 0; Row < 3; ++Row)
	{
		for (int32 Col = 0; Col < 4; ++Col)
		{
			if (Rng.FRand() < 0.2f)
			{
				continue;
			}
			const float X0 = R.Min.X + 400.f + Col * 1350.f, Y0 = R.Min.Y + 400.f + Row * 900.f;
			const int32 Stack = Rng.RandRange(1, 3);
			for (int32 S = 0; S < Stack; ++S)
			{
				UInstancedStaticMeshComponent* Color = Rng.FRand() < 0.3f ? Accent.Get() : Buildings[Rng.RandRange(0, 5)].Get();
				Box(Color, X0, X0 + 1200.f, Y0, Y0 + 245.f, Curb + S * 260.f, Curb + (S + 1) * 260.f);
			}
		}
	}
	const FVector2D C = R.GetCenter();
	if (B.BX == 0)
	{
		// gantry crane over the water
		const float CY = R.Max.Y - 1000.f;
		for (const FVector2D& Leg : { FVector2D(-900.f, -400.f), FVector2D(900.f, -400.f), FVector2D(-900.f, 400.f), FVector2D(900.f, 400.f) })
		{
			Box(Metal, C.X + Leg.X - 50.f, C.X + Leg.X + 50.f, CY + Leg.Y - 50.f, CY + Leg.Y + 50.f, Curb, Curb + 2800.f);
		}
		Box(Metal, C.X - 1000.f, C.X + 1000.f, CY - 500.f, CY + 500.f, Curb + 2600.f, Curb + 2800.f);
		Box(Metal, C.X - 150.f, C.X + 150.f, CY - 500.f, CY + 3000.f, Curb + 2600.f, Curb + 2800.f);
	}
	else
	{
		Building(ECityKit::Shop, 1, C.X - 800.f, C.X + 800.f, R.Max.Y - 2600.f, R.Max.Y - 1800.f, 500.f, 90.f);
		AddLocation(EBoostedLocationType::Exports, C.X, R.Max.Y - 700.f, 90.f);
	}
}

void ABoostedCity::HomeGarage(const FBox2D& R)
{
	const FVector2D C = R.GetCenter();
	Houses(SubX(R, R.Min.X, C.X - 600.f), false);
	Box(Lot, C.X - 600.f, R.Max.X, R.Min.Y, R.Max.Y, Curb - 0.5f, Curb + 1.8f);
	const float X0 = C.X + 200.f, X1 = R.Max.X - 200.f, Y0 = C.Y - 400.f, Y1 = C.Y + 1200.f;
	Building(ECityKit::Shop, 0, X0, X1, Y0, Y1, 700.f, 90.f);
	Box(Metal, X0 + 300.f, X0 + 1000.f, Y1, Y1 + 5.f, Curb, Curb + 450.f);
	Box(Metal, X0 + 1300.f, X0 + 2000.f, Y1, Y1 + 5.f, Curb, Curb + 450.f);
	AddLocation(EBoostedLocationType::Garage, X0 + 650.f, Y1 + 500.f, 90.f);
	SpawnLocal = FTransform(FRotator(0.f, 90.f, 0.f), FVector(X0 + 1500.f, Y1 + 1150.f, Curb + 100.f));
}

void ABoostedCity::ChopShop(const FBox2D& R)
{
	const FVector2D C = R.GetCenter();
	Industrial(SubX(R, R.Min.X, C.X - 400.f));
	Box(Lot, C.X - 400.f, R.Max.X, R.Min.Y, R.Max.Y, Curb - 0.5f, Curb + 1.8f);
	const float X0 = C.X, X1 = R.Max.X - 200.f, Y0 = R.Min.Y + 300.f, Y1 = C.Y + 800.f;
	Building(ECityKit::Warehouse, 5, X0, X1, Y0, Y1, 900.f, 90.f);
	Box(Metal, X0 + 600.f, X0 + 1400.f, Y1, Y1 + 5.f, Curb, Curb + 500.f);
	// junk pile: crushed cars
	for (int32 i = 0; i < 6; ++i)
	{
		const float JX = R.Max.X - 600.f - (i % 3) * 220.f, JY = R.Max.Y - 400.f - (i / 3) * 220.f;
		Box(Buildings[Rng.RandRange(0, 5)], JX, JX + 200.f, JY, JY + 200.f, Curb, Curb + 140.f + (i % 2) * 140.f);
	}
	AddLocation(EBoostedLocationType::ChopShop, X0 + 1000.f, Y1 + 500.f, 90.f);
}

void ABoostedCity::BodyShop(const FBox2D& R)
{
	const FVector2D C = R.GetCenter();
	Apartments(SubX(R, R.Min.X, C.X - 200.f));
	Box(Lot, C.X - 200.f, R.Max.X, R.Min.Y, R.Max.Y, Curb - 0.5f, Curb + 1.8f);
	const float X0 = C.X + 400.f, X1 = R.Max.X - 200.f, Y0 = C.Y - 600.f, Y1 = C.Y + 1000.f;
	Building(ECityKit::Shop, 4, X0, X1, Y0, Y1, 650.f, 90.f);
	Box(Metal, X0 + 600.f, X0 + 1400.f, Y1, Y1 + 5.f, Curb, Curb + 460.f);
	AddLocation(EBoostedLocationType::BodyShop, X0 + 1000.f, Y1 + 500.f, 90.f);
}

void ABoostedCity::PoliceStation(const FBox2D& R)
{
	const FVector2D C = R.GetCenter();
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	Building(ECityKit::Shop, 2, R.Min.X + 400.f, R.Max.X - 400.f, R.Min.Y + 400.f, C.Y + 200.f, 1000.f, 90.f);
	for (int32 i = 0; i < 8; ++i)
	{
		Spot(C.X - 1600.f + i * 320.f, C.Y + 1200.f, 90.f, true);
	}
	Cyl(Poles, C.X + 1200.f, C.Y + 600.f, Curb, Curb + 900.f, 6.f);
	AddLocation(EBoostedLocationType::PoliceStation, C.X, R.Max.Y - 200.f, 90.f);
}

void ABoostedCity::GasStation(const FBox2D& R)
{
	const FVector2D C = R.GetCenter();
	Box(Lot, R.Min.X, R.Max.X, R.Min.Y, R.Max.Y, Curb - 1.f, Curb + 1.5f);
	const float CX = C.X - 600.f, CY = C.Y + 600.f;
	Box(Buildings[4], CX - 1200.f, CX + 1200.f, CY - 700.f, CY + 700.f, Curb + 500.f, Curb + 600.f);
	Box(Accent, CX - 1200.f, CX + 1200.f, CY - 710.f, CY + 710.f, Curb + 570.f, Curb + 610.f);
	for (const float LX : { -800.f, 0.f, 800.f })
	{
		Cyl(Poles, CX + LX, CY, Curb, Curb + 500.f, 15.f);
		Box(Accent, CX + LX - 60.f, CX + LX + 60.f, CY - 260.f, CY - 180.f, Curb, Curb + 160.f);
		Box(Accent, CX + LX - 60.f, CX + LX + 60.f, CY + 180.f, CY + 260.f, Curb, Curb + 160.f);
		Spot(CX + LX, CY - 480.f, 0.f);
	}
	Building(ECityKit::Shop, 1, R.Min.X + 400.f, R.Min.X + 2200.f, R.Min.Y + 300.f, R.Min.Y + 1500.f, 450.f, 90.f);
}

void ABoostedCity::RoadMarkings()
{
	const float H = RoadWidth * 0.5f;
	const float Z0 = 0.2f, Z1 = 1.2f;
	for (int32 i = 0; i <= N; ++i)
	{
		for (int32 j = 0; j < N; ++j)
		{
			const float Fixed = RoadCoord(i);
			const float A0 = RoadCoord(j) + H + 300.f, A1 = RoadCoord(j + 1) - H - 300.f;
			// road running along Y at X = Fixed
			Box(LineYellow, Fixed - 23.f, Fixed - 13.f, A0, A1, Z0, Z1);
			Box(LineYellow, Fixed + 13.f, Fixed + 23.f, A0, A1, Z0, Z1);
			Box(LineWhite, Fixed - H + 45.f, Fixed - H + 55.f, A0, A1, Z0, Z1);
			Box(LineWhite, Fixed + H - 55.f, Fixed + H - 45.f, A0, A1, Z0, Z1);
			// road running along X at Y = Fixed
			Box(LineYellow, A0, A1, Fixed - 23.f, Fixed - 13.f, Z0, Z1);
			Box(LineYellow, A0, A1, Fixed + 13.f, Fixed + 23.f, Z0, Z1);
			Box(LineWhite, A0, A1, Fixed - H + 45.f, Fixed - H + 55.f, Z0, Z1);
			Box(LineWhite, A0, A1, Fixed + H - 55.f, Fixed + H - 45.f, Z0, Z1);
		}
	}
	// crosswalks on every approach
	const float Limit = (N / 2) * Pitch() + 10.f;
	for (int32 i = 0; i <= N; ++i)
	{
		for (int32 j = 0; j <= N; ++j)
		{
			const float CX = RoadCoord(i), CY = RoadCoord(j);
			for (const FVector2D& Dir : { FVector2D(1.f, 0.f), FVector2D(-1.f, 0.f), FVector2D(0.f, 1.f), FVector2D(0.f, -1.f) })
			{
				const float OX = CX + Dir.X * (H + 160.f), OY = CY + Dir.Y * (H + 160.f);
				if (FMath::Abs(OX) > Limit || FMath::Abs(OY) > Limit)
				{
					continue;
				}
				for (float K = -H + 80.f; K < H - 50.f; K += 120.f)
				{
					if (Dir.X != 0.f)
					{
						Box(LineWhite, OX - 140.f, OX + 140.f, OY + K - 30.f, OY + K + 30.f, Z0, Z1);
					}
					else
					{
						Box(LineWhite, OX + K - 30.f, OX + K + 30.f, OY - 140.f, OY + 140.f, Z0, Z1);
					}
				}
			}
		}
	}
}

void ABoostedCity::StreetLights()
{
	for (const FCityBlock& B : Blocks)
	{
		const FBox2D& R = B.Rect;
		for (int32 Side = 0; Side < 4; ++Side)
		{
			for (const float T : { 0.25f, 0.75f })
			{
				float X, Y, DX = 0.f, DY = 0.f;
				if (Side == 0) { X = FMath::Lerp(R.Min.X, R.Max.X, T); Y = R.Min.Y + 50.f; DY = -1.f; }
				else if (Side == 1) { X = FMath::Lerp(R.Min.X, R.Max.X, T); Y = R.Max.Y - 50.f; DY = 1.f; }
				else if (Side == 2) { X = R.Min.X + 50.f; Y = FMath::Lerp(R.Min.Y, R.Max.Y, T); DX = -1.f; }
				else { X = R.Max.X - 50.f; Y = FMath::Lerp(R.Min.Y, R.Max.Y, T); DX = 1.f; }
				Cyl(Poles, X, Y, Curb, Curb + 750.f, 9.f);
				const float EX = X + DX * 260.f, EY = Y + DY * 260.f;
				Box(Poles, FMath::Min(X, EX) - 6.f, FMath::Max(X, EX) + 6.f, FMath::Min(Y, EY) - 6.f, FMath::Max(Y, EY) + 6.f, Curb + 735.f, Curb + 747.f);
				Box(Lamps, EX - 25.f - FMath::Abs(DY) * 20.f, EX + 25.f + FMath::Abs(DY) * 20.f, EY - 25.f - FMath::Abs(DX) * 20.f, EY + 25.f + FMath::Abs(DX) * 20.f, Curb + 722.f, Curb + 735.f);
			}
		}
	}
}

void ABoostedCity::Perimeter()
{
	const float E = (N / 2) * Pitch() + RoadWidth * 0.5f + 60.f;
	const float T = 70.f;
	Box(Sidewalk, -E - T, -E, -E, E, 0.f, 110.f);
	Box(Sidewalk, E, E + T, -E, E, 0.f, 110.f);
	Box(Sidewalk, -E, E, -E - T, -E, 0.f, 110.f);
	Box(Sidewalk, -E, E, E, E + T, 0.f, 110.f);
	Box(Grass, -E - 40000.f, -E - T, -E - 40000.f, E + 1400.f, 0.f, 2.f);
	Box(Grass, E + T, E + 40000.f, -E - 40000.f, E + 1400.f, 0.f, 2.f);
	Box(Grass, -E - T, E + T, -E - 40000.f, -E - T, 0.f, 2.f);
}

// ---------------------------------------------------------------------- runtime spawning

void ABoostedCity::SpawnLightingIfNeeded()
{
	UWorld* World = GetWorld();
	for (TActorIterator<ADirectionalLight> It(World); It; ++It)
	{
		Sun = *It;
		return;
	}
	if (!bSpawnLightingIfMissing)
	{
		return;
	}
	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	if (ADirectionalLight* SunActor = World->SpawnActor<ADirectionalLight>(ADirectionalLight::StaticClass(), FTransform(SunRotation, FVector(0.f, 0.f, 10000.f)), P))
	{
		if (UDirectionalLightComponent* L = Cast<UDirectionalLightComponent>(SunActor->GetLightComponent()))
		{
			L->SetMobility(EComponentMobility::Movable);
			L->SetIntensity(8.f);
			L->SetLightColor(FLinearColor(1.f, 0.86f, 0.72f));
			L->SetAtmosphereSunLight(true);
		}
		Sun = SunActor;
	}
	World->SpawnActor<ASkyAtmosphere>(ASkyAtmosphere::StaticClass(), FTransform::Identity, P);
	if (ASkyLight* Sky = World->SpawnActor<ASkyLight>(ASkyLight::StaticClass(), FTransform::Identity, P))
	{
		if (USkyLightComponent* SC = Sky->GetLightComponent())
		{
			SC->SetMobility(EComponentMobility::Movable);
			SC->bRealTimeCapture = true;
			SC->MarkRenderStateDirty();
			SC->RecaptureSky();
		}
	}
	World->SpawnActor<AExponentialHeightFog>(AExponentialHeightFog::StaticClass(), FTransform::Identity, P);
}

void ABoostedCity::SpawnKitBuildings()
{
	UWorld* World = GetWorld();
	for (AActor* A : KitActors)
	{
		if (A)
		{
			A->Destroy();
		}
	}
	KitActors.Reset();
	for (const FCityKitLot& L : KitLots)
	{
		const TArray<TObjectPtr<UStaticMesh>>* List = nullptr;
		switch (L.Kit)
		{
		case ECityKit::House: List = &HouseMeshes; break;
		case ECityKit::Shop: List = &ShopMeshes; break;
		case ECityKit::Apartment: List = &ApartmentMeshes; break;
		case ECityKit::Tower: List = &TowerMeshes; break;
		case ECityKit::Warehouse: List = &WarehouseMeshes; break;
		}
		if (!List || List->Num() == 0)
		{
			continue;
		}
		UStaticMesh* Mesh = (*List)[Rng.RandRange(0, List->Num() - 1)];
		if (!Mesh)
		{
			continue;
		}
		// rotate the mesh's front (+X) to face the street, then scale uniformly to fit the lot
		const FBox Bounds = Mesh->GetBoundingBox();
		const FVector Size = Bounds.GetSize();
		const bool bSideways = FMath::Abs(FMath::Fmod(FMath::Abs(L.Yaw), 180.f) - 90.f) < 1.f;
		const float LotX = L.Rect.Max.X - L.Rect.Min.X, LotY = L.Rect.Max.Y - L.Rect.Min.Y;
		const float FitX = (bSideways ? LotY : LotX) / FMath::Max(1.f, Size.X);
		const float FitY = (bSideways ? LotX : LotY) / FMath::Max(1.f, Size.Y);
		const float Scale = FMath::Clamp(FMath::Min(FitX, FitY), 0.1f, 10.f);
		const FVector2D C = L.Rect.GetCenter();
		const FVector Local(C.X, C.Y, Curb - Bounds.Min.Z * Scale);
		const FTransform T = FTransform(FRotator(0.f, L.Yaw, 0.f), Local, FVector(Scale)) * GetActorTransform();
		FActorSpawnParameters P;
		P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		if (AStaticMeshActor* A = World->SpawnActor<AStaticMeshActor>(AStaticMeshActor::StaticClass(), T, P))
		{
			A->GetStaticMeshComponent()->SetMobility(EComponentMobility::Movable);
			A->GetStaticMeshComponent()->SetStaticMesh(Mesh);
			A->SetActorScale3D(FVector(Scale));
			KitActors.Add(A);
		}
	}
}
