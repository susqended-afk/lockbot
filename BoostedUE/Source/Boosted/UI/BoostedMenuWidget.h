// One reusable menu panel (title, subtitle, scrolling list of text, buttons and option rows) built in code.
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "BoostedMenuWidget.generated.h"

class UCanvasPanel;
class UBorder;
class UTextBlock;
class UScrollBox;
class UWidget;

UCLASS()
class BOOSTED_API UBoostedMenuWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	void SetPage(const FString& Title, const FString& Subtitle = FString());
	void ClearItems();
	void AddHeader(const FString& Text);
	void AddText(const FString& Text, const FLinearColor& Color = FLinearColor(0.72f, 0.75f, 0.8f), int32 Size = 15);
	/** Right is an optional price / status shown on the button. */
	void AddButton(const FString& Label, TFunction<void()> OnClick, bool bEnabled = true, bool bPrimary = false, const FString& Right = FString(), const FLinearColor* Swatch = nullptr);
	void AddOption(const FString& Label, const FString& Value, TFunction<void()> OnPrev, TFunction<void()> OnNext, bool bEnabled = true);
	void AddTextInput(const FString& Label, const FString& Value, TFunction<void(const FString&)> OnChanged);
	void AddSpacer(float Height = 10.f);

protected:
	virtual TSharedRef<SWidget> RebuildWidget() override;

private:
	void BuildTree();
	void AddItem(UWidget* Widget, float Top = 3.f);
	UTextBlock* MakeText(const FString& Text, int32 Size, const FLinearColor& Color, bool bBold = false);

	UPROPERTY(Transient) TObjectPtr<UCanvasPanel> Root;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> TitleText;
	UPROPERTY(Transient) TObjectPtr<UTextBlock> SubtitleText;
	UPROPERTY(Transient) TObjectPtr<UScrollBox> Items;
};
