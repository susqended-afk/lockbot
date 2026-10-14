// In-game HUD (cash, wanted stars, Street Cred, objective, prompts, speedometer, toasts, banners), built in code.
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "BoostedHUDWidget.generated.h"

class UCanvasPanel;
class UTextBlock;
class UProgressBar;
class UBorder;
class UVerticalBox;

UCLASS()
class BOOSTED_API UBoostedHUDWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	void Toast(const FString& Text, const FLinearColor& Color);
	void Banner(const FString& Big, const FString& Sub, const FLinearColor& Color, float Seconds = 2.6f);

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;
	virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

private:
	void BuildTree();
	UTextBlock* MakeText(int32 Size, const FLinearColor& Color, bool bBold = true);
	UBorder* MakeBox(UWidget* Content, float Alpha = 0.6f);
	void Refresh();

	UPROPERTY(Transient) TObjectPtr<UCanvasPanel> Root;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> CashText;
	UPROPERTY(Transient) TArray<TObjectPtr<UBorder>> StarBoxes;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> CredText;
	UPROPERTY(Transient) TObjectPtr<UBorder> ObjectiveBox;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> ObjectiveText;
	UPROPERTY(Transient) TObjectPtr<UBorder> PromptBox;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> PromptText;
	UPROPERTY(Transient) TObjectPtr<UProgressBar> PromptBar;
	UPROPERTY(Transient) TObjectPtr<UVerticalBox> Speedo;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> SpeedText;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> CarText;
	UPROPERTY(Transient) TObjectPtr<UProgressBar> HealthBar;
	UPROPERTY(Transient) TObjectPtr<UProgressBar> NitroBar;
	UPROPERTY(Transient) TObjectPtr<UVerticalBox> EvadeBox;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> EvadeText;
	UPROPERTY(Transient) TObjectPtr<UProgressBar> EvadeBar;
	UPROPERTY(Transient) TObjectPtr<UVerticalBox> Toasts;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> BannerBig;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> BannerSub;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> HintText;

	TArray<TPair<TWeakObjectPtr<UWidget>, float>> ToastTimes;
	float BannerTime = 0.f;
	float Clock = 0.f;
};
