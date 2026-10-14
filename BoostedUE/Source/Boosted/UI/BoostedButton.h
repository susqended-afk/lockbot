// Small UMG helpers that call a C++ lambda, so menus can be built entirely in code.
#pragma once

#include "CoreMinimal.h"
#include "Components/Button.h"
#include "Components/EditableTextBox.h"
#include "BoostedButton.generated.h"

UCLASS()
class BOOSTED_API UBoostedButton : public UButton
{
	GENERATED_BODY()

public:
	void SetCallback(TFunction<void()> InCallback);

private:
	UFUNCTION() void HandleClicked();

	TFunction<void()> Callback;
	bool bBound = false;
};

UCLASS()
class BOOSTED_API UBoostedTextBox : public UEditableTextBox
{
	GENERATED_BODY()

public:
	void SetCallback(TFunction<void(const FString&)> InCallback);

private:
	UFUNCTION() void HandleChanged(const FText& NewText);

	TFunction<void(const FString&)> Callback;
	bool bBound = false;
};
