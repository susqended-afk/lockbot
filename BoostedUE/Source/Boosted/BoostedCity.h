// Generates the city of San Bravo (roads, hood blocks, downtown, industrial, docks, landmarks) from instanced meshes,
// and exposes the road grid that traffic and police drive on. Drop one in an empty level, or let the game mode spawn it.
// Building "kits" let you swap the placeholder boxes for real building meshes without code.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BoostedTypes.h"
#include "BoostedCity.generated.h"

class UInstancedStaticMeshComponent;
class UMaterialInterface;
class UStaticMesh;
class ABoostedLocation;
class ADirectionalLight;

struct FCityBlock
{
	int32 BX = 0;
	int32 BY = 0;
	TCHAR Type = 'C';
	FBox2D Rect;
	FVector2D Center() const { return Rect.GetCenter(); }
};

struct FParkingSpot
{
	FVector Location = FVector::ZeroVector; // world space
	float Yaw = 0.f;
	bool bPolice = false;
};

UENUM()
enum class ECityKit : uint8
{
	House,
	Shop,
	Apartment,
	Tower,
	Warehouse
};

struct FCityKitLot
{
	ECityKit Kit = ECityKit::House;
	FBox2D Rect;
	float Height = 0.f;
	float Yaw = 0.f;
};

struct FCityLocationSpec
{
	EBoostedLocationType Type = EBoostedLocationType::Garage;
	FVector Local = FVector::ZeroVector;
	float Yaw = 0.f;
};

UCLASS()
class BOOSTED_API ABoostedCity : public AActor
{
	GENERATED_BODY()

public:
	ABoostedCity();

	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	/** Find the city in the world, or spawn one at the origin. */
	static ABoostedCity* Get(UWorld* World);

	// ------------------------------------------------------------------ settings
	UPROPERTY(EditAnywhere, Category = "City") int32 Seed = 1337;
	/** Spawn sun, sky, sky light and fog if the level has no directional light. */
	UPROPERTY(EditAnywhere, Category = "City") bool bSpawnLightingIfMissing = true;
	/** Sun angle when lighting is spawned (golden hour by default). */
	UPROPERTY(EditAnywhere, Category = "City") FRotator SunRotation = FRotator(-24.f, 35.f, 0.f);

	/** Optional real materials. Leave empty to use flat colors. */
	UPROPERTY(EditAnywhere, Category = "City|Materials") TObjectPtr<UMaterialInterface> RoadMaterial;
	UPROPERTY(EditAnywhere, Category = "City|Materials") TObjectPtr<UMaterialInterface> SidewalkMaterial;
	UPROPERTY(EditAnywhere, Category = "City|Materials") TObjectPtr<UMaterialInterface> GrassMaterial;

	/** Building kits: when a list has meshes, those buildings are spawned instead of boxes (scaled to fit each lot). */
	UPROPERTY(EditAnywhere, Category = "City|Building Kits") TArray<TObjectPtr<UStaticMesh>> HouseMeshes;
	UPROPERTY(EditAnywhere, Category = "City|Building Kits") TArray<TObjectPtr<UStaticMesh>> ShopMeshes;
	UPROPERTY(EditAnywhere, Category = "City|Building Kits") TArray<TObjectPtr<UStaticMesh>> ApartmentMeshes;
	UPROPERTY(EditAnywhere, Category = "City|Building Kits") TArray<TObjectPtr<UStaticMesh>> TowerMeshes;
	UPROPERTY(EditAnywhere, Category = "City|Building Kits") TArray<TObjectPtr<UStaticMesh>> WarehouseMeshes;

	// ------------------------------------------------------------------ grid (cm)
	static constexpr int32 N = 8;
	static constexpr float BlockSize = 6400.f;
	static constexpr float RoadWidth = 1400.f;
	static constexpr float SidewalkWidth = 350.f;
	static constexpr float Curb = 15.f;
	static constexpr float Lane = 350.f;
	static float Pitch() { return BlockSize + RoadWidth; }
	static float RoadCoord(int32 I) { return (I - N / 2) * Pitch(); }

	FVector NodeLocation(int32 I, int32 J) const;
	FIntPoint NearestNode(const FVector& WorldLocation) const;
	bool IsValidNode(int32 I, int32 J) const { return I >= 0 && J >= 0 && I <= N && J <= N; }

	const TArray<FCityBlock>& GetBlocks() const { return Blocks; }
	const TArray<FParkingSpot>& GetParkingSpots() const { return ParkingSpots; }
	FTransform GetPlayerSpawn() const;
	ABoostedLocation* FindLocation(EBoostedLocationType Type) const;
	const TArray<TObjectPtr<ABoostedLocation>>& GetLocations() const { return Locations; }
	/** Points around a block's sidewalk (world space), for pedestrians. */
	TArray<FVector> SidewalkLoop(int32 BlockIndex) const;

private:
	void Generate();
	void ClearAll();
	UInstancedStaticMeshComponent* MakeISM(const TCHAR* Name, const TCHAR* MeshPath, bool bCollision, bool bShadows = true);
	void Paint(UInstancedStaticMeshComponent* ISM, const FLinearColor& Color, UMaterialInterface* Override = nullptr);

	// geometry helpers (local space)
	void Box(UInstancedStaticMeshComponent* ISM, float X0, float X1, float Y0, float Y1, float Z0, float Z1);
	void Cyl(UInstancedStaticMeshComponent* ISM, float X, float Y, float Z0, float Z1, float Radius);
	void Building(ECityKit Kit, int32 Palette, float X0, float X1, float Y0, float Y1, float Height, float FrontYaw);
	void GableRoof(float X0, float X1, float Y0, float Y1, float Z);
	void Tree(float X, float Y, float Scale);
	void Spot(float X, float Y, float Yaw, bool bPolice = false);
	void AddLocation(EBoostedLocationType Type, float X, float Y, float Yaw);

	// district builders
	void BuildBlock(const FCityBlock& B);
	void Houses(const FBox2D& R, bool bTrees);
	void Commercial(const FBox2D& R);
	void Downtown(const FBox2D& R);
	void Apartments(const FBox2D& R);
	void Industrial(const FBox2D& R);
	void Park(const FBox2D& R);
	void ParkingLot(const FBox2D& R);
	void Docks(const FCityBlock& B);
	void HomeGarage(const FBox2D& R);
	void ChopShop(const FBox2D& R);
	void BodyShop(const FBox2D& R);
	void PoliceStation(const FBox2D& R);
	void GasStation(const FBox2D& R);
	void RoadMarkings();
	void StreetLights();
	void Perimeter();

	void SpawnLightingIfNeeded();
	void SpawnKitBuildings();

	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<USceneComponent> SceneRoot;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Ground;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Water;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Sidewalk;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Grass;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Lot;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> LineWhite;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> LineYellow;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Roof;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Trim;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Accent;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Metal;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Trunk;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Leaves;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Poles;
	UPROPERTY(VisibleAnywhere, Category = "City") TObjectPtr<UInstancedStaticMeshComponent> Lamps;
	UPROPERTY(VisibleAnywhere, Category = "City") TArray<TObjectPtr<UInstancedStaticMeshComponent>> Buildings;

	UPROPERTY() TObjectPtr<UMaterialInterface> BaseMaterial;
	UPROPERTY(Transient) TWeakObjectPtr<ADirectionalLight> Sun;
	UPROPERTY(Transient) TArray<TObjectPtr<ABoostedLocation>> Locations;
	UPROPERTY(Transient) TArray<TObjectPtr<AActor>> KitActors;

	TArray<FCityBlock> Blocks;
	TArray<FParkingSpot> ParkingSpots;
	TArray<FCityLocationSpec> LocationSpecs;
	TArray<FCityKitLot> KitLots;
	FTransform SpawnLocal;
	FRandomStream Rng;
};
