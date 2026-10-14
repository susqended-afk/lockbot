// AI for traffic / police drivers (follow the road grid, chase the player) and pedestrians (walk sidewalks, flee).
#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "BoostedAI.generated.h"

class ABoostedVehicle;
class ABoostedCity;
class ABoostedCharacter;

UCLASS()
class BOOSTED_API ABoostedAIDriver : public AAIController
{
	GENERATED_BODY()

public:
	ABoostedAIDriver();

	virtual void Tick(float DeltaSeconds) override;

	/** Drive the lane from node From toward neighbouring node To, then keep picking turns. */
	void StartCruise(const FIntPoint& From, const FIntPoint& To);
	void StartPursuit();
	void StopPursuit();
	void Panic(float Seconds) { PanicTime = Seconds; }
	bool IsPursuing() const { return bPursuit; }

	UPROPERTY(EditAnywhere, Category = "Boosted") float CruiseSpeed = 12.f; // m/s

private:
	ABoostedVehicle* Car() const;
	void PlanTurn();
	void DriveCruise(float DeltaSeconds);
	void DrivePursuit(float DeltaSeconds);
	float ObstacleAhead(float Range) const;
	void SteerTo(const FVector& Target, float WantSpeed, bool bHandbrake = false);

	TWeakObjectPtr<ABoostedCity> City;
	bool bPursuit = false;
	FIntPoint From = FIntPoint::ZeroValue;
	FIntPoint To = FIntPoint::ZeroValue;
	FIntPoint Dir = FIntPoint(1, 0);
	FIntPoint NextTo = FIntPoint::ZeroValue;
	FIntPoint NextDir = FIntPoint(1, 0);
	TArray<FVector> Waypoints;
	int32 WaypointIndex = 0;
	bool bTurning = false;
	FVector RouteTarget = FVector::ZeroVector;
	float RouteUntil = 0.f;
	float StuckTime = 0.f;
	float ReverseTime = 0.f;
	float PanicTime = 0.f;
};

UCLASS()
class BOOSTED_API ABoostedPedController : public AAIController
{
	GENERATED_BODY()

public:
	ABoostedPedController();

	virtual void Tick(float DeltaSeconds) override;

	void SetLoop(const TArray<FVector>& Points, int32 Start, bool bClockwise);
	void Flee(const FVector& From, float Seconds);

	UPROPERTY(EditAnywhere, Category = "Boosted") float WalkSpeed = 150.f;
	UPROPERTY(EditAnywhere, Category = "Boosted") float RunSpeed = 560.f;

private:
	ABoostedCharacter* Ped() const;
	void CheckTraffic();

	TArray<FVector> Loop;
	int32 Next = 0;
	int32 Step = 1;
	float FleeTime = 0.f;
	FVector FleeFrom = FVector::ZeroVector;
};
