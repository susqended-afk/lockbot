// Game rules: wanted level and busting, streaming parked cars / traffic / police / pedestrians around the player,
// and the money actions (chop, export, respray, garage storage).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "BoostedTypes.h"
#include "BoostedGameMode.generated.h"

class ABoostedCity;
class ABoostedVehicle;
class ABoostedCharacter;
class ABoostedPlayerController;
class UBoostedGameInstance;

UCLASS()
class BOOSTED_API ABoostedGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ABoostedGameMode();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual UClass* GetDefaultPawnClassForController_Implementation(AController* InController) override;
	virtual void RestartPlayer(AController* NewPlayer) override;

	// ------------------------------------------------------------------ wanted
	UPROPERTY(BlueprintReadOnly, Category = "Boosted|Wanted") int32 WantedLevel = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Boosted|Wanted") float EvadeTimer = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Boosted|Wanted") bool bCopsSeePlayer = false;
	UPROPERTY(BlueprintReadOnly, Category = "Boosted|Wanted") float BustTimer = 0.f;
	float WantedFlash = 0.f;

	float GetEvadeNeeded() const { return 5.f + WantedLevel * 3.f; }
	void AddWanted(int32 Stars, const FString& Reason);
	void ClearWanted(bool bReward);

	// ------------------------------------------------------------------ events
	void OnBreakIn(ABoostedVehicle* V);
	void OnCarjack(ABoostedVehicle* V);
	void OnPlayerStoleVehicle(ABoostedVehicle* V);
	void OnVehicleImpact(ABoostedVehicle* V, AActor* Other, float ImpactMS);
	void OnPedestrianHit(ABoostedCharacter* Ped, ABoostedVehicle* By);
	void OnHorn(ABoostedVehicle* V);

	// ------------------------------------------------------------------ money
	void ChopVehicle(ABoostedVehicle* V);
	void ExportVehicle(ABoostedVehicle* V);
	/** Body shop: repair + new paint code + plates; clears your stars if no cop can see you. */
	bool ResprayVehicle(ABoostedVehicle* V);
	bool StoreVehicle(ABoostedVehicle* V);
	void TakeOutCar(int32 GarageIndex);
	void Busted();
	/** Re-spawn the player's body after the character creator changed it. */
	void RespawnPlayerBody();

	ABoostedVehicle* SpawnCar(FName ModelId, const FTransform& Transform, EVehicleRole Role, const FCarUpgrades* Upgrades = nullptr, float Health = 1.f);
	ABoostedCity* GetCity();
	UBoostedGameInstance* GetGI() const;
	ABoostedPlayerController* GetPC() const;
	FName PickCivilianModel(bool bForParking) const;

private:
	void UpdateWanted(float DeltaSeconds);
	void UpdateSpawning();
	void SpawnTraffic(const FVector& Around, bool bPolice, bool bPursuit);
	ABoostedCharacter* SpawnPedestrian(const FVector& Location, const FRotator& Rotation);
	void SpawnWalker(const FVector& Around);
	void PlacePlayerAt(EBoostedLocationType Type);
	FCarUpgrades FactoryUpgrades(FName ModelId) const;
	void AnnounceXP(int32 Amount);
	void WarnNoVehicleClass();

	UPROPERTY(Transient) TObjectPtr<ABoostedCity> City;
	TArray<TWeakObjectPtr<ABoostedVehicle>> SpotCars;
	TArray<float> SpotNext;
	TArray<TWeakObjectPtr<ABoostedVehicle>> Traffic;
	TArray<TWeakObjectPtr<ABoostedCharacter>> Walkers;
	float SpawnTimer = 0.f;
	float LastRamTime = -10.f;
	bool bWarnedNoVehicle = false;
};
