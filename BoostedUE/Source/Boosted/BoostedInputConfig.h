// Builds every Enhanced Input action and key mapping in code, so no input assets need to be made in the editor.
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "InputCoreTypes.h"
#include "InputActionValue.h"
#include "BoostedInputConfig.generated.h"

class UInputAction;
class UInputMappingContext;

UCLASS()
class BOOSTED_API UBoostedInputConfig : public UObject
{
	GENERATED_BODY()

public:
	void Build();

	// on foot
	UPROPERTY() TObjectPtr<UInputAction> Move;
	UPROPERTY() TObjectPtr<UInputAction> Look;
	UPROPERTY() TObjectPtr<UInputAction> Jump;
	UPROPERTY() TObjectPtr<UInputAction> Sprint;
	UPROPERTY() TObjectPtr<UInputAction> Interact;

	// driving
	UPROPERTY() TObjectPtr<UInputAction> Throttle;
	UPROPERTY() TObjectPtr<UInputAction> Brake;
	UPROPERTY() TObjectPtr<UInputAction> Steer;
	UPROPERTY() TObjectPtr<UInputAction> Handbrake;
	UPROPERTY() TObjectPtr<UInputAction> Nitro;
	UPROPERTY() TObjectPtr<UInputAction> Horn;

	// always on
	UPROPERTY() TObjectPtr<UInputAction> Pause;

	UPROPERTY() TObjectPtr<UInputMappingContext> OnFootContext;
	UPROPERTY() TObjectPtr<UInputMappingContext> DrivingContext;
	UPROPERTY() TObjectPtr<UInputMappingContext> GlobalContext;

private:
	UInputAction* MakeAction(const TCHAR* Name, EInputActionValueType Type);
	/** Map a key. Swizzle routes a 1D key onto the Y axis of a 2D action; NegateX/Y flip axes. */
	void Map(UInputMappingContext* Context, UInputAction* Action, const FKey& Key, bool bSwizzle = false, bool bNegateX = false, bool bNegateY = false, float Scale = 1.f, bool bDeadZone = false);
};
