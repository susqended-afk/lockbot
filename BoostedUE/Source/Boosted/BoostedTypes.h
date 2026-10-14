// Shared types: car upgrades, stored cars, character looks, contracts, catalog entries and the economy tables.
#pragma once

#include "CoreMinimal.h"
#include "UObject/SoftObjectPtr.h"
#include "BoostedTypes.generated.h"

class ABoostedVehicle;
class AWheeledVehiclePawn;
class ABoostedCharacter;
class USkeletalMesh;
class UStaticMesh;

BOOSTED_API DECLARE_LOG_CATEGORY_EXTERN(LogBoosted, Log, All);

UENUM(BlueprintType)
enum class EBoostedLocationType : uint8
{
	Garage,
	ChopShop,
	Exports,
	BodyShop,
	PoliceStation
};

UENUM(BlueprintType)
enum class EVehicleRole : uint8
{
	Parked,
	Traffic,
	Police,
	Player,
	Abandoned
};

UENUM(BlueprintType)
enum class EPaintFinish : uint8
{
	Gloss,
	Metallic,
	Matte,
	Pearl,
	Chrome
};

UENUM(BlueprintType)
enum class EBoostedUpgrade : uint8
{
	Engine,
	Blower,
	Tires,
	Suspension,
	Brakes,
	Nitro,
	Armor
};

/** Everything that can be changed on a car. Performance levels drive physics; the rest drives visuals. */
USTRUCT(BlueprintType)
struct BOOSTED_API FCarUpgrades
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Engine = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Blower = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Tires = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Suspension = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Brakes = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Nitro = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance") int32 Armor = 0;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") FLinearColor Paint = FLinearColor(0.02f, 0.02f, 0.025f);
	/** Index into the settings paint list, or -1 for a factory color. Used by boost-list contracts. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") int32 PaintIndex = -1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") EPaintFinish Finish = EPaintFinish::Gloss;
	/** Wheel style index. Handled in the vehicle Blueprint (OnUpgradesApplied) by swapping wheel meshes. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") int32 Wheels = 0;
	/** Spoiler index. Handled in the vehicle Blueprint (OnUpgradesApplied). */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") int32 Spoiler = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") int32 Tint = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") bool bUnderglow = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") FLinearColor UnderglowColor = FLinearColor(0.55f, 0.15f, 1.f);
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Looks") FString Plate;

	int32 GetLevel(EBoostedUpgrade Type) const;
	void SetLevel(EBoostedUpgrade Type, int32 Level);
};

/** A car parked in your garage (or saved with your profile). */
USTRUCT(BlueprintType)
struct BOOSTED_API FStoredCar
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Car") FName ModelId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Car") FCarUpgrades Upgrades;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Car") float Health = 1.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Car") bool bHot = false;
};

/** The player's character choices. Indices point into the wardrobe lists in Project Settings > Game > Boosted. */
USTRUCT(BlueprintType)
struct BOOSTED_API FCharacterLook
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") FString Name = TEXT("Lil Boost");
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Body = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Top = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Bottom = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Shoes = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Headwear = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 Chain = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 TopColor = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 BottomColor = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 ShoesColor = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Look") int32 HeadwearColor = 0;
};

/** A buyer on the boost list who wants a specific build delivered to Port Exports. */
USTRUCT(BlueprintType)
struct BOOSTED_API FBoostContract
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") FName ModelId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") FString Buyer;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") int32 Reward = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") int32 PaintIndex = -1;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") int32 MinEngine = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") bool bRequireFinish = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") EPaintFinish Finish = EPaintFinish::Gloss;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Contract") bool bRequireBlower = false;
};

USTRUCT(BlueprintType)
struct BOOSTED_API FBoostedStats
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Stolen = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Chopped = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Exported = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Contracts = 0;
};

/** One car model in the catalog. Names are fictional parodies; real brands need a license before release. */
USTRUCT(BlueprintType)
struct BOOSTED_API FBoostedCarModel
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") FString Make;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") FString Model;
	/** Street value in dollars for an undamaged, stock car. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") int32 Value = 10000;
	/** Spawn weight: higher = more common on the streets. 0 = never spawns as a civilian car. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") float Rarity = 10.f;
	/** Multiplies the Blueprint's engine torque so one vehicle Blueprint can stand in for several models. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") float PerformanceScale = 1.f;
	/** Vehicle Blueprint for this model (any Chaos vehicle Blueprint). Leave empty to use Default Vehicle Class. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") TSoftClassPtr<AWheeledVehiclePawn> VehicleClass;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Car") TArray<FLinearColor> FactoryColors;

	FString GetDisplayName() const { return Make + TEXT(" ") + Model; }
};

USTRUCT(BlueprintType)
struct BOOSTED_API FPaintOption
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Paint") FString Name;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Paint") FLinearColor Color = FLinearColor::White;
};

/** A clothing piece (MetaHuman-compatible skeletal mesh). An entry with no mesh means "none". */
USTRUCT(BlueprintType)
struct BOOSTED_API FBoostedOutfitPiece
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Outfit") FString Name;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Outfit") TSoftObjectPtr<USkeletalMesh> Mesh;
	/** Apply the chosen clothing color to this piece's materials. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Outfit") bool bTintable = true;
};

/** A rigid accessory (chain, watch) attached to a skeleton socket. */
USTRUCT(BlueprintType)
struct BOOSTED_API FBoostedAccessory
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessory") FString Name;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessory") TSoftObjectPtr<UStaticMesh> Mesh;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessory") FName Socket = TEXT("neck_01");
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Accessory") FTransform Offset;
};

/** A playable body: usually a MetaHuman Blueprint reparented to BoostedCharacter. */
USTRUCT(BlueprintType)
struct BOOSTED_API FBoostedBodyPreset
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Body") FString Name;
	/**
	 * A MetaHuman Blueprint (BP_Name) or any character Blueprint. BoostedCharacter Blueprints spawn as they are;
	 * anything else is worn by a BOOSTED character, animated by the mannequin's animations.
	 */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Body") TSoftClassPtr<AActor> CharacterClass;
};

/** Prices, upgrade tiers and Street Cred math. */
namespace BoostedEconomy
{
	constexpr int32 StartingCash = 2500;
	constexpr int32 PaintCost = 500;
	constexpr int32 VinSwapCost = 300;
	constexpr int32 UnderglowCost = 1500;
	constexpr int32 PlateCost = 250;
	constexpr int32 GarageSlots = 5;

	BOOSTED_API const TArray<EBoostedUpgrade>& AllUpgrades();
	BOOSTED_API FString UpgradeName(EBoostedUpgrade Type);
	BOOSTED_API int32 MaxLevel(EBoostedUpgrade Type);
	BOOSTED_API FString LevelName(EBoostedUpgrade Type, int32 Level);
	/** Price of going from Level-1 to Level. */
	BOOSTED_API int32 LevelCost(EBoostedUpgrade Type, int32 Level);
	BOOSTED_API int32 CredRequired(EBoostedUpgrade Type, int32 Level);
	BOOSTED_API FString FinishName(EPaintFinish Finish);
	BOOSTED_API int32 FinishCost(EPaintFinish Finish);
	/** Total money sunk into a car's mods. */
	BOOSTED_API int32 UpgradeSpend(const FCarUpgrades& U);
	BOOSTED_API int32 CredLevel(int32 XP);
	BOOSTED_API int32 XPForLevel(int32 Level);
	BOOSTED_API FString Money(int32 Amount);
	BOOSTED_API FString RandomPlate();
}
