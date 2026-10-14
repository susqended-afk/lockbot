// The player's profile (cash, Street Cred, garage, look, boost list) that lives across levels, plus save/load.
#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "BoostedTypes.h"
#include "BoostedGameInstance.generated.h"

class UBoostedInputConfig;

UCLASS()
class BOOSTED_API UBoostedGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintReadOnly, Category = "Profile") int32 Cash = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") int32 XP = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") int32 Tutorial = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") FCharacterLook Look;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") TArray<FStoredCar> Garage;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") TArray<FBoostContract> Contracts;
	UPROPERTY(BlueprintReadOnly, Category = "Profile") FBoostedStats Stats;
	/** False on the title screen, true once a game has been started or loaded. */
	UPROPERTY(BlueprintReadOnly, Category = "Profile") bool bInGame = false;

	UBoostedInputConfig* GetInputConfig();

	// ------------------------------------------------------------------ profile
	void NewGame(const FCharacterLook& InLook);
	bool HasSave() const;
	bool LoadProfile();
	void SaveProfile();

	UFUNCTION(BlueprintPure, Category = "Profile") int32 GetCredLevel() const;
	/** Returns true when this pushed you to a new Street Cred level. */
	bool AddXP(int32 Amount);
	bool CanAfford(int32 Amount) const { return Cash >= Amount; }

	// ------------------------------------------------------------------ boost list
	void EnsureContracts();
	FBoostContract MakeContract() const;
	void CompleteContract(int32 Index);
	TArray<FString> DescribeContract(const FBoostContract& C) const;
	/** Unmet requirements for this car (empty = it qualifies). */
	TArray<FString> MissingForContract(const FBoostContract& C, FName ModelId, const FCarUpgrades& U) const;
	/** Highest-paying contract this car qualifies for, or INDEX_NONE. */
	int32 FindBestContract(FName ModelId, const FCarUpgrades& U) const;

	// ------------------------------------------------------------------ prices
	static int32 CarValue(FName ModelId, const FCarUpgrades& U, float Health);
	static int32 ChopPrice(FName ModelId, const FCarUpgrades& U, float Health);
	static int32 ExportPrice(FName ModelId, const FCarUpgrades& U, float Health, bool bHot);
	static int32 RepairCost(FName ModelId, float Health);
	static FString CarName(FName ModelId);

private:
	UPROPERTY() TObjectPtr<UBoostedInputConfig> InputConfig;

	static const TCHAR* SlotName;
};
