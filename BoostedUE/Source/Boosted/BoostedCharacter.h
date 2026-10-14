// Third-person character used for the player and pedestrians. It can wear any MetaHuman or character Blueprint
// (WearAppearance): the mannequin keeps playing the animations invisibly and the MetaHuman's body, face, hair and
// clothes follow its pose. The wardrobe system dresses Torso/Legs/Feet components (or the built-in slots).
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "BoostedTypes.h"
#include "BoostedCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class ABoostedVehicle;
struct FInputActionValue;

UCLASS()
class BOOSTED_API ABoostedCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ABoostedCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	// ------------------------------------------------------------------ components
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Camera") TObjectPtr<USpringArmComponent> CameraBoom;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Camera") TObjectPtr<UCameraComponent> FollowCamera;
	/** Built-in outfit slots, used when the Blueprint has no MetaHuman Torso/Legs/Feet components. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Wardrobe") TObjectPtr<USkeletalMeshComponent> TopSlot;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Wardrobe") TObjectPtr<USkeletalMeshComponent> BottomSlot;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Wardrobe") TObjectPtr<USkeletalMeshComponent> ShoesSlot;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Wardrobe") TObjectPtr<USkeletalMeshComponent> HeadwearSlot;
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Boosted|Wardrobe") TObjectPtr<UStaticMeshComponent> ChainSlot;

	// ------------------------------------------------------------------ wardrobe setup
	/** Skeletal mesh component that drives clothing (MetaHuman "Body"). Falls back to the character Mesh. */
	UPROPERTY(EditAnywhere, Category = "Boosted|Wardrobe") FName BodyComponentName = TEXT("Body");
	UPROPERTY(EditAnywhere, Category = "Boosted|Wardrobe") TArray<FName> TopComponentNames;
	UPROPERTY(EditAnywhere, Category = "Boosted|Wardrobe") TArray<FName> BottomComponentNames;
	UPROPERTY(EditAnywhere, Category = "Boosted|Wardrobe") TArray<FName> ShoesComponentNames;

	// ------------------------------------------------------------------ tuning
	UPROPERTY(EditAnywhere, Category = "Boosted|Movement") float JogSpeed = 420.f;
	UPROPERTY(EditAnywhere, Category = "Boosted|Movement") float SprintSpeed = 700.f;
	UPROPERTY(EditAnywhere, Category = "Boosted|Stealing") float BreakInTime = 2.4f;
	UPROPERTY(EditAnywhere, Category = "Boosted|Stealing") float PoliceBreakInTime = 3.6f;
	UPROPERTY(EditAnywhere, Category = "Boosted|Stealing") float InteractRange = 330.f;

	// ------------------------------------------------------------------ API
	UFUNCTION(BlueprintCallable, Category = "Boosted") void ApplyLook(const FCharacterLook& InLook);
	/**
	 * Wear the parts of a MetaHuman Blueprint (BP_Name) or any character Blueprint, driven by this character's
	 * animations. Once per character: respawn the character to change body.
	 */
	void WearAppearance(UClass* Source);
	UClass* GetAppearanceSource() const { return AppearanceSource; }
	/** Hook for Blueprint-only cosmetics (hair color, tattoos...). */
	UFUNCTION(BlueprintImplementableEvent, Category = "Boosted") void OnLookApplied(const FCharacterLook& InLook);
	/** Play a lock-picking / window-smash montage here. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Boosted") void OnBreakInStarted();
	UFUNCTION(BlueprintImplementableEvent, Category = "Boosted") void OnBreakInStopped();

	void SetInVehicle(ABoostedVehicle* Vehicle);
	void LeaveVehicle(const FVector& Location, const FRotator& Rotation);
	void Knockdown(const FVector& Impulse);
	bool IsKnockedDown() const { return bKnockedDown; }

	const FString& GetPromptText() const { return PromptText; }
	const FString& GetPromptKey() const { return PromptKey; }
	float GetPromptProgress() const { return PromptProgress; }

protected:
	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void SprintStart(const FInputActionValue& Value);
	void SprintStop(const FInputActionValue& Value);
	void InteractStart(const FInputActionValue& Value);
	void InteractStop(const FInputActionValue& Value);

	void UpdateInteraction(float DeltaSeconds);
	ABoostedVehicle* FindNearbyVehicle() const;
	void EnsureMesh();
	USkeletalMeshComponent* GetBodyComponent() const;
	USkeletalMeshComponent* FindSkeletalByNames(const TArray<FName>& Names) const;
	void DressSlot(USkeletalMeshComponent* Target, const TArray<FBoostedOutfitPiece>& List, int32 Index, int32 ColorIndex);

	UPROPERTY(Transient) TObjectPtr<UClass> AppearanceSource;

	bool bInteractHeld = false;
	bool bInteractPressed = false;
	bool bKnockedDown = false;
	float BreakInProgress = 0.f;
	TWeakObjectPtr<ABoostedVehicle> FocusVehicle;
	FString PromptText;
	FString PromptKey;
	float PromptProgress = -1.f;
};
