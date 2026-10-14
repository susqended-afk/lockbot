// A drive-in spot (garage, chop shop, exports, body shop). Stop inside the glowing pad to open its menu.
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BoostedTypes.h"
#include "BoostedLocation.generated.h"

class UStaticMeshComponent;
class UPointLightComponent;
class UTextRenderComponent;

UCLASS()
class BOOSTED_API ABoostedLocation : public AActor
{
	GENERATED_BODY()

public:
	ABoostedLocation();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	void Setup(EBoostedLocationType InType);

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Boosted") EBoostedLocationType Type = EBoostedLocationType::Garage;
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Boosted") float Radius = 550.f;
	/** Police station: shown on the HUD but never opens a menu. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Boosted") bool bPassive = false;

	UPROPERTY(VisibleAnywhere, Category = "Boosted") TObjectPtr<UStaticMeshComponent> Pad;
	UPROPERTY(VisibleAnywhere, Category = "Boosted") TObjectPtr<UPointLightComponent> Glow;
	UPROPERTY(VisibleAnywhere, Category = "Boosted") TObjectPtr<UTextRenderComponent> Label;

	FString GetDisplayName() const;
	FLinearColor GetColor() const;
	static FString NameFor(EBoostedLocationType InType);
	static FLinearColor ColorFor(EBoostedLocationType InType);

private:
	bool bArmed = false;
};
