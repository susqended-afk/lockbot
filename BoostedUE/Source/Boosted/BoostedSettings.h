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

	/**
	 * Vehicle Blueprint used for any model without its own Vehicle Class. Any Chaos vehicle Blueprint works:
	 * ones reparented to BoostedVehicle spawn as they are, others lend their mesh and handling to a BOOSTED car.
	 * Defaults to the Vehicle template's sports car.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TSoftClassPtr<AWheeledVehiclePawn> DefaultVehicleClass;

	/** Vehicle Blueprint for police cruisers. Empty = the Vehicle template's offroad car, else the default car. */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TSoftClassPtr<AWheeledVehiclePawn> PoliceVehicleClass;

	/** Colors sold at The Spot. Boost-list buyers ask for these by name. */
	UPROPERTY(Config, EditAnywhere, Category = "Cars")
	TArray<FPaintOption> Paints;

	// ------------------------------------------------------------------ characters
	/**
	 * Playable bodies shown in the character creator: MetaHuman Blueprints (BP_Name) or character Blueprints.
	 * Leave empty to use every MetaHuman in the MetaHumans Folder automatically.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<FBoostedBodyPreset> Bodies;

	/** Where assembled MetaHumans land (each in its own folder as BP_Name). */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	FString MetaHumansFolder = TEXT("/Game/MetaHumans");

	/**
	 * People walking the streets and drivers you pull out of cars (MetaHuman or character Blueprints).
	 * Leave empty to use the playable bodies, or the mannequin if there are none.
	 */
	UPROPERTY(Config, EditAnywhere, Category = "Characters")
	TArray<TSoftClassPtr<AActor>> PedestrianClasses;

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

	// ------------------------------------------------------------------ driving (player car; tweak while playing)
	/** Extra tire grip for every car. 1 = the car Blueprint's own grip. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0.2", ClampMax = "4"))
	float TireGrip = 1.5f;

	/** Arcade help that stops the player's car sliding sideways. 0 = pure physics, 1 = on rails. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0", ClampMax = "1"))
	float GripAssist = 0.7f;

	/** Grip Assist while holding the handbrake, so you can still drift. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0", ClampMax = "1"))
	float HandbrakeGripAssist = 0.05f;

	/** Stops the car spinning out once you let go of the steering. 0 = off. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0", ClampMax = "1"))
	float SpinAssist = 0.5f;

	/** How fast the wheels turn toward full lock when you press A/D (full lock in 1/this seconds). */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0.5", ClampMax = "20"))
	float SteerSpeed = 3.f;

	/** How fast the wheels straighten when you let go. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0.5", ClampMax = "20"))
	float SteerReturnSpeed = 5.f;

	/** Share of steering left at High Speed MPH and above (less twitchy on the highway). */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0.1", ClampMax = "1"))
	float HighSpeedSteering = 0.55f;

	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "20", ClampMax = "200"))
	float HighSpeedMPH = 80.f;

	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "200", ClampMax = "2000"))
	float CameraDistance = 700.f;

	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "0", ClampMax = "600"))
	float CameraHeight = 120.f;

	/** How quickly the camera swings round behind the car. Higher = tighter. */
	UPROPERTY(Config, EditAnywhere, Category = "Driving", meta = (ClampMin = "1", ClampMax = "30"))
	float CameraFollowSpeed = 6.f;

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
	/** Bodies, or every assembled MetaHuman found in MetaHumans Folder when Bodies is empty. */
	TArray<FBoostedBodyPreset> GetBodies() const;
	/** The vehicle Blueprint to spawn for a model. May not be a BoostedVehicle; see ABoostedVehicle::CopyBodyFrom. */
	UClass* ResolveVehicleClass(FName Id) const;
	UClass* ResolvePoliceClass() const;

private:
	mutable TArray<FBoostedBodyPreset> FoundMetaHumans;
	mutable double LastMetaHumanScan = -1000.0;
};
