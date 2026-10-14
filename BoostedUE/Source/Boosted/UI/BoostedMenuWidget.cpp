#include "UI/BoostedMenuWidget.h"
#include "UI/BoostedButton.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/ButtonSlot.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/ScrollBox.h"
#include "Components/ScrollBoxSlot.h"
#include "Components/SizeBox.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Styling/CoreStyle.h"

namespace
{
	const FLinearColor PanelColor(0.012f, 0.013f, 0.017f, 0.9f);
	const FLinearColor ButtonColor(0.08f, 0.085f, 0.1f, 1.f);
	const FLinearColor PrimaryColor(0.05f, 0.75f, 0.28f, 1.f);
	const FLinearColor Money(0.24f, 1.f, 0.55f, 1.f);
}

TSharedRef<SWidget> UBoostedMenuWidget::RebuildWidget()
{
	if (WidgetTree && !WidgetTree->RootWidget)
	{
		BuildTree();
	}
	return Super::RebuildWidget();
}

UTextBlock* UBoostedMenuWidget::MakeText(const FString& Text, int32 Size, const FLinearColor& Color, bool bBold)
{
	UTextBlock* T = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
	T->SetText(FText::FromString(Text));
	T->SetFont(FCoreStyle::GetDefaultFontStyle(bBold ? "Bold" : "Regular", Size));
	T->SetColorAndOpacity(FSlateColor(Color));
	T->SetAutoWrapText(true);
	return T;
}

void UBoostedMenuWidget::BuildTree()
{
	Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("Root"));
	WidgetTree->RootWidget = Root;

	UBorder* Panel = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass(), TEXT("Panel"));
	Panel->SetBrushColor(PanelColor);
	Panel->SetPadding(FMargin(28.f, 24.f));
	UCanvasPanelSlot* PanelSlot = Root->AddChildToCanvas(Panel);
	// left column, stretched vertically, fixed width
	PanelSlot->SetAnchors(FAnchors(0.f, 0.06f, 0.f, 0.94f));
	PanelSlot->SetOffsets(FMargin(36.f, 0.f, 560.f, 0.f));

	UVerticalBox* Column = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Panel->SetContent(Column);

	TitleText = MakeText(TEXT("BOOSTED"), 34, FLinearColor::White, true);
	SubtitleText = MakeText(TEXT(""), 14, FLinearColor(0.6f, 0.63f, 0.68f));
	Column->AddChildToVerticalBox(TitleText);
	UVerticalBoxSlot* SubSlot = Column->AddChildToVerticalBox(SubtitleText);
	SubSlot->SetPadding(FMargin(0.f, 2.f, 0.f, 14.f));

	Items = WidgetTree->ConstructWidget<UScrollBox>(UScrollBox::StaticClass());
	UVerticalBoxSlot* ItemsSlot = Column->AddChildToVerticalBox(Items);
	ItemsSlot->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
}

void UBoostedMenuWidget::SetPage(const FString& Title, const FString& Subtitle)
{
	if (!TitleText)
	{
		TakeWidget();
	}
	TitleText->SetText(FText::FromString(Title.ToUpper()));
	SubtitleText->SetText(FText::FromString(Subtitle));
	SubtitleText->SetVisibility(Subtitle.IsEmpty() ? ESlateVisibility::Collapsed : ESlateVisibility::HitTestInvisible);
	ClearItems();
}

void UBoostedMenuWidget::ClearItems()
{
	if (Items)
	{
		Items->ClearChildren();
		Items->ScrollToStart();
	}
}

void UBoostedMenuWidget::AddItem(UWidget* Widget, float Top)
{
	if (UScrollBoxSlot* S = Cast<UScrollBoxSlot>(Items->AddChild(Widget)))
	{
		S->SetPadding(FMargin(0.f, Top, 0.f, 3.f));
		S->SetHorizontalAlignment(HAlign_Fill);
	}
}

void UBoostedMenuWidget::AddHeader(const FString& Text)
{
	AddItem(MakeText(Text.ToUpper(), 13, FLinearColor(0.55f, 0.58f, 0.64f), true), 14.f);
}

void UBoostedMenuWidget::AddText(const FString& Text, const FLinearColor& Color, int32 Size)
{
	AddItem(MakeText(Text, Size, Color));
}

void UBoostedMenuWidget::AddSpacer(float Height)
{
	USizeBox* Box = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	Box->SetHeightOverride(Height);
	AddItem(Box, 0.f);
}

void UBoostedMenuWidget::AddButton(const FString& Label, TFunction<void()> OnClick, bool bEnabled, bool bPrimary, const FString& Right, const FLinearColor* Swatch)
{
	UBoostedButton* Button = WidgetTree->ConstructWidget<UBoostedButton>(UBoostedButton::StaticClass());
	Button->SetBackgroundColor(Swatch ? *Swatch : (bPrimary ? PrimaryColor : ButtonColor));
	Button->SetCallback(MoveTemp(OnClick));
	Button->SetIsEnabled(bEnabled);

	UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	const FLinearColor TextColor = bPrimary ? FLinearColor(0.01f, 0.06f, 0.02f) : FLinearColor::White;
	UHorizontalBoxSlot* L = Row->AddChildToHorizontalBox(MakeText(Label, 16, TextColor, true));
	L->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	L->SetVerticalAlignment(VAlign_Center);
	if (!Right.IsEmpty())
	{
		UHorizontalBoxSlot* R = Row->AddChildToHorizontalBox(MakeText(Right, 14, bPrimary ? TextColor : Money, true));
		R->SetVerticalAlignment(VAlign_Center);
		R->SetPadding(FMargin(12.f, 0.f, 0.f, 0.f));
	}
	if (UButtonSlot* S = Cast<UButtonSlot>(Button->AddChild(Row)))
	{
		S->SetPadding(FMargin(14.f, 10.f));
		S->SetHorizontalAlignment(HAlign_Fill);
	}
	AddItem(Button);
}

void UBoostedMenuWidget::AddOption(const FString& Label, const FString& Value, TFunction<void()> OnPrev, TFunction<void()> OnNext, bool bEnabled)
{
	UHorizontalBox* Row = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	UHorizontalBoxSlot* L = Row->AddChildToHorizontalBox(MakeText(Label, 15, FLinearColor(0.75f, 0.78f, 0.83f), true));
	L->SetSize(FSlateChildSize(ESlateSizeRule::Fill));
	L->SetVerticalAlignment(VAlign_Center);

	auto Arrow = [this, bEnabled](const TCHAR* Glyph, TFunction<void()> Fn)
	{
		UBoostedButton* B = WidgetTree->ConstructWidget<UBoostedButton>(UBoostedButton::StaticClass());
		B->SetBackgroundColor(ButtonColor);
		B->SetCallback(MoveTemp(Fn));
		B->SetIsEnabled(bEnabled);
		if (UButtonSlot* S = Cast<UButtonSlot>(B->AddChild(MakeText(Glyph, 16, FLinearColor::White, true))))
		{
			S->SetPadding(FMargin(12.f, 6.f));
		}
		return B;
	};
	Row->AddChildToHorizontalBox(Arrow(TEXT("<"), MoveTemp(OnPrev)))->SetVerticalAlignment(VAlign_Center);
	USizeBox* ValueBox = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
	ValueBox->SetWidthOverride(190.f);
	UTextBlock* ValueText = MakeText(Value, 15, FLinearColor::White, true);
	ValueText->SetJustification(ETextJustify::Center);
	ValueBox->SetContent(ValueText);
	UHorizontalBoxSlot* V = Row->AddChildToHorizontalBox(ValueBox);
	V->SetVerticalAlignment(VAlign_Center);
	V->SetPadding(FMargin(6.f, 0.f));
	Row->AddChildToHorizontalBox(Arrow(TEXT(">"), MoveTemp(OnNext)))->SetVerticalAlignment(VAlign_Center);
	AddItem(Row);
}

void UBoostedMenuWidget::AddTextInput(const FString& Label, const FString& Value, TFunction<void(const FString&)> OnChanged)
{
	AddHeader(Label);
	UBoostedTextBox* Box = WidgetTree->ConstructWidget<UBoostedTextBox>(UBoostedTextBox::StaticClass());
	Box->SetText(FText::FromString(Value));
	Box->SetCallback(MoveTemp(OnChanged));
	AddItem(Box);
}
