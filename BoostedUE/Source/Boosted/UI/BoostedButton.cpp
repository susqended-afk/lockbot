#include "UI/BoostedButton.h"

void UBoostedButton::SetCallback(TFunction<void()> InCallback)
{
	Callback = MoveTemp(InCallback);
	if (!bBound)
	{
		OnClicked.AddDynamic(this, &UBoostedButton::HandleClicked);
		bBound = true;
	}
}

void UBoostedButton::HandleClicked()
{
	if (Callback)
	{
		// copy: the callback may rebuild the menu and destroy this button
		TFunction<void()> Run = Callback;
		Run();
	}
}

void UBoostedTextBox::SetCallback(TFunction<void(const FString&)> InCallback)
{
	Callback = MoveTemp(InCallback);
	if (!bBound)
	{
		OnTextChanged.AddDynamic(this, &UBoostedTextBox::HandleChanged);
		bBound = true;
	}
}

void UBoostedTextBox::HandleChanged(const FText& NewText)
{
	if (Callback)
	{
		Callback(NewText.ToString());
	}
}
