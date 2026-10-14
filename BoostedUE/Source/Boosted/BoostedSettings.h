// Project Settings > Game > Boosted: the car catalog, playable characters, wardrobe and world tuning.
#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "UObject/SoftObjectPath.h"
#include "BoostedTypes.h"
#include "BoostedSettings.generated.h"

UCLASS(Config = Game, DefaultConfig, meta = (DisplayName = "Boosted"))
class BOOSTED_API UBoostedSettings : public UDeveloperSettings
{
	GENERATED_BODY()

public:
	UBoostedSettings();

	virtual FName GetCategoryName() const override { return TEXT("Game"); }

	static const UBoostedSettings* Get() { return GetDefault<UBoostedSettings>(); }

	// ------------------------------------------------------------------ cars
	/** Every car model that can appear in the game. */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TArray<FBoostedCarModel> Cars;

	/** Vehicle Blueprint used for any model without its own Vehicle Class (make this from the Vehicle template car). */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TSoftClassPtr<ABoostedVehicle> DefaultVehicleClass;

	/** Vehicle Blueprint for police cruisers (falls back to Default Vehicle Class painted black and white). */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TSoftClassPtr<ABoostedVehicle> PoliceVehicleClass;

	/** Colors sold at The Spot. Boost-list buyers ask for these by name. */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TArray<FPaintOption> Paints;

	// ------------------------------------------------------------------ characters
	/** Playable bodies shown in the character creator (MetaHuman Blueprints reparented to BoostedCharacter). */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<FBoostedBodyPreset> Bodies;

	/** Characters used for people walking the streets and drivers you pull out of cars. */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<TSoftClassPtr<ABoostedCharacter>> PedestrianClasses;

	/** Used when a character has no mesh set (the UE5 Third Person template mannequin). First one that exists wins. */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<FSoftObjectPath> FallbackCharacterMeshes;

	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<FSoftClassPath> FallbackAnimClasses;

	// ------------------------------------------------------------------ wardrobe
	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FBoostedOutfitPiece> Tops;

	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FBoostedOutfitPiece> Bottoms;

	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FBoostedOutfitPiece> Shoes;

	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FBoostedOutfitPiece> Headwear;

	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FBoostedAccessory> Chains;

	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FPaintOption> ClothingColors;

	/** Material parameters set to the chosen clothing color (whichever ones the clothing material has). */
	UPROPERTY(Config, EditAnywhere, Category = "Wardrobe")
	TArray<FName> ClothingColorParameters;

	// ------------------------------------------------------------------ world
	UPROPERTY(Config, EditAnywhere, Category = "World", meta = (ClampMin = "0", ClampMax = "60"))
	int32 TrafficCars = 16;

	UPROPERTY(Config, EditAnywhere, Category = "World", meta = (ClampMin = "0", ClampMax = "40"))
	int32 Pedestrians = 10;

	/** Parked cars appear within this distance of the player (cm). */
	UPROPERTY(Config, EditAnywhere, Category = "World")
	float ParkedCarRadius = 12000.f;

	/** Sun movement speed when the city spawned the lighting: 1 = a full day every 24 minutes, 0 = frozen at golden hour. */
	UPROPERTY(Config, EditAnywhere, Category = "World")
	float DayNightSpeed = 0.f;

	// ------------------------------------------------------------------ helpers
	const FBoostedCarModel* FindCar(FName Id) const;
	TSubclassOf<ABoostedVehicle> ResolveVehicleClass(FName Id) const;
	TSubclassOf<ABoostedVehicle> ResolvePoliceClass() const;
};
