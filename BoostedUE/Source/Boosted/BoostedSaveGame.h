#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "BoostedTypes.h"
#include "BoostedSaveGame.generated.h"

/** Everything written to disk for a profile. */
UCLASS()
class BOOSTED_API UBoostedSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY() int32 Version = 1;
	UPROPERTY() int32 Cash = 0;
	UPROPERTY() int32 XP = 0;
	UPROPERTY() int32 Tutorial = 0;
	UPROPERTY() FCharacterLook Look;
	UPROPERTY() TArray<FStoredCar> Garage;
	UPROPERTY() TArray<FBoostContract> Contracts;
	UPROPERTY() FBoostedStats Stats;
};
