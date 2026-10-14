// Player controller: getting in/out of cars, input contexts, HUD, and every menu (title, character creator,
// garage + upgrade shop, chop shop, exports, body shop, pause, busted).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "BoostedTypes.h"
#include "BoostedPlayerController.generated.h"

class ABoostedVehicle;
class ABoostedCharacter;
class ABoostedLocation;
class ABoostedGameMode;
class UBoostedGameInstance;
class UBoostedHUDWidget;
class UBoostedMenuWidget;
class ACameraActor;
struct FInputActionValue;

UCLASS()
class BOOSTED_API ABoostedPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	virtual void BeginPlay() override;
	virtual void SetupInputComponent() override;
	virtual void OnPossess(APawn* InPawn) override;

	// ------------------------------------------------------------------ vehicles
	void EnterVehicle(ABoostedVehicle* V, bool bCarjack);
	void ExitVehicle(bool bForce);
	ABoostedVehicle* GetVehicle() const;
	ABoostedCharacter* GetOnFootCharacter() const { return OnFootCharacter; }
	void SetOnFootCharacter(ABoostedCharacter* InCharacter) { OnFootCharacter = InCharacter; }

	// ------------------------------------------------------------------ HUD & menus
	void Toast(const FString& Text, const FLinearColor& Color = FLinearColor(0.24f, 1.f, 0.55f));
	void Banner(const FString& Big, const FString& Sub, const FLinearColor& Color);
	bool IsMenuOpen() const { return bMenuOpen; }
	FString GetObjective() const;
	void OnEnterLocation(ABoostedLocation* Location);
	void ShowBusted(int32 Fine, const FString& LostCar);
	void CloseMenu();

private:
	ABoostedGameMode* GM() const;
	UBoostedGameInstance* GI() const;
	void OpenMenu(bool bPauseGame);
	void ApplyInputContexts();
	void OnPausePressed(const FInputActionValue& Value);
	void FocusCameraOn(AActor* Target, float Distance, float Height, float Side);
	void RestoreCamera();
	bool Spend(int32 Cost, int32 CredRequired = 1);
	void Upgrade(ABoostedVehicle* V, TFunctionRef<void(FCarUpgrades&)> Change);
	FString Directions(EBoostedLocationType Type) const;

	void ShowTitle();
	void ShowCreator(bool bNewGame);
	void RenderCreator();
	void ApplyEditLook(bool bBodyChanged);
	void ShowGarage();
	void ShowGaragePerformance();
	void ShowGaragePaint();
	void ShowGarageStyle();
	void ShowChop(ABoostedVehicle* V);
	void ShowExport(ABoostedVehicle* V);
	void ShowBodyShop(ABoostedVehicle* V);
	void ShowPause();
	void ShowBoostList(TFunction<void()> Back);
	void ShowControls(TFunction<void()> Back);

	UPROPERTY(Transient) TObjectPtr<UBoostedHUDWidget> HUD;
	UPROPERTY(Transient) TObjectPtr<UBoostedMenuWidget> Menu;
	UPROPERTY(Transient) TObjectPtr<ABoostedCharacter> OnFootCharacter;
	UPROPERTY(Transient) TObjectPtr<ACameraActor> MenuCamera;

	bool bMenuOpen = false;
	bool bPausedByMenu = false;
	TFunction<void()> BackAction;
	FCharacterLook EditLook;
	bool bCreatorNewGame = false;
};
