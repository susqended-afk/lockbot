// A drivable Chaos vehicle that can be parked, driven by traffic/police AI, stolen, upgraded, chopped or sold.
// Make Blueprints of this class from any Chaos vehicle (e.g. the Vehicle template's sports car).
#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "BoostedTypes.h"
#include "BoostedVehicle.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UPointLightComponent;
class UAudioComponent;
class UMaterialInstanceDynamic;
class UChaosWheeledVehicleMovementComponent;
class ABoostedCharacter;
struct FInputActionValue;

UCLASS()
class BOOSTED_API ABoostedVehicle : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	ABoostedVehicle();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void PossessedBy(AController* NewController) override;
	virtual void UnPossessed() override;
	virtual void NotifyHit(UPrimitiveComponent* MyComp, AActor* Other, UPrimitiveComponent* OtherComp, bool bSelfMoved, FVector HitLocation, FVector HitNormal, FVector NormalImpulse, const FHitResult& Hit) override;

	// ------------------------------------------------------------------ components
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Camera") TObjectPtr<USpringArmComponent> SpringArm;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Camera") TObjectPtr<UCameraComponent> Camera;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Lights") TObjectPtr<UPointLightComponent> SirenRed;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Lights") TObjectPtr<UPointLightComponent> SirenBlue;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Lights") TObjectPtr<UPointLightComponent> UnderglowLight;
	/** Give it a looping engine sound (MetaSound or Sound Cue). A float parameter "RPM" is fed every frame. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Audio") TObjectPtr<UAudioComponent> EngineAudio;

	// ------------------------------------------------------------------ state
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Boosted") FName ModelId = TEXT("hellhound");
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") EVehicleRole Role = EVehicleRole::Parked;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Boosted") bool bLocked = true;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") bool bHot = false;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") bool bOwned = false;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") bool bStolen = false;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Boosted") bool bIsPolice = false;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") bool bSirenOn = false;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") bool bPursuit = false;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") float Health = 1.f;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") float NitroFuel = 1.f;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted") FCarUpgrades Upgrades;

	/** Player character riding inside (hidden while driving). */
	UPROPERTY(Transient) TWeakObjectPtr<ABoostedCharacter> Driver;
	/** Parking spot this car was spawned on (so the spawner can free it). */
	int32 SpotIndex = INDEX_NONE;

	// ------------------------------------------------------------------ paint setup (per Blueprint)
	/** Vector parameters set to the paint color on the body material(s). Add your car material's color parameter here. */
	UPROPERTY(EditAnywhere, Category = "Boosted|Paint") TArray<FName> PaintColorParameters;
	/** Material slots / material names containing any of these words get painted. */
	UPROPERTY(EditAnywhere, Category = "Boosted|Paint") TArray<FString> PaintMaterialKeywords;
	/** Explicit material slot indices to paint (used in addition to keywords). */
	UPROPERTY(EditAnywhere, Category = "Boosted|Paint") TArray<int32> PaintMaterialSlots;

	// ------------------------------------------------------------------ tuning
	/** Extra forward acceleration per nitrous level (cm/s^2). */
	UPROPERTY(EditAnywhere, Category = "Boosted|Tuning") float NitroAccel = 900.f;
	/** Impacts slower than this (m/s) don't hurt the car. */
	UPROPERTY(EditAnywhere, Category = "Boosted|Tuning") float DamageThreshold = 5.f;

	// ------------------------------------------------------------------ API
	/** Apply upgrades: physics (torque, grip, brakes), paint, underglow. Calls OnUpgradesApplied for Blueprint mesh swaps. */
	UFUNCTION(BlueprintCallable, Category = "Boosted") void ApplyUpgrades(const FCarUpgrades& NewUpgrades);
	/** Implement in the vehicle Blueprint to swap wheels/spoilers/hoods by Upgrades.Wheels / Upgrades.Spoiler. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Boosted") void OnUpgradesApplied();
	/** Called on big hits so Blueprints can add sparks / dents / sounds. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Boosted") void OnHeavyImpact(float ImpactSpeed, FVector Location);

	void SetDriveInputs(float InThrottle, float InBrake, float InSteer, bool bInHandbrake);
	void SetParked(bool bParked);
	void TriggerAlarm(float Seconds);
	void Repair() { Health = 1.f; }

	UChaosWheeledVehicleMovementComponent* GetChaos() const;
	/** Signed forward speed in m/s. */
	float GetForwardSpeedMS() const;
	float GetSpeedMPH() const;
	int32 GetGear() const;
	float GetRPM() const;
	FString GetDisplayName() const;
	FVector GetDoorLocation() const;
	float GetHalfLength() const;
	bool IsWrecked() const { return Health <= 0.f; }
	bool HasAIDriver() const;
	bool IsNitroActive() const { return bNitroActive; }
	float GetInputSteer() const { return InputSteer; }

protected:
	void OnThrottle(const FInputActionValue& Value);
	void OnBrake(const FInputActionValue& Value);
	void OnSteer(const FInputActionValue& Value);
	void OnHandbrakeStart(const FInputActionValue& Value);
	void OnHandbrakeStop(const FInputActionValue& Value);
	void OnNitroStart(const FInputActionValue& Value);
	void OnNitroStop(const FInputActionValue& Value);
	void OnInteract(const FInputActionValue& Value);
	void OnLook(const FInputActionValue& Value);
	void OnHorn(const FInputActionValue& Value);

	void CacheBaseTuning();
	void CachePaintMaterials();
	void ApplyPaint();

	UPROPERTY(Transient) TArray<TObjectPtr<UMaterialInstanceDynamic>> PaintMaterials;

	bool bBaseCaptured = false;
	float BaseTorque = 0.f;
	TArray<float> BaseFriction;
	TArray<float> BaseBrake;

	float InputThrottle = 0.f;
	float InputSteer = 0.f;
	bool bNitroHeld = false;
	bool bNitroActive = false;
	float AlarmTimer = 0.f;
	float SirenTimer = 0.f;
	float LastImpactTime = -10.f;
	FRotator LookOffset = FRotator::ZeroRotator;
	float LookIdle = 10.f;
};
