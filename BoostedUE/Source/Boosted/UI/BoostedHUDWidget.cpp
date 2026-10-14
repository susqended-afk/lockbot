#include "UI/BoostedHUDWidget.h"
#include "BoostedCharacter.h"
#include "BoostedGameInstance.h"
#include "BoostedGameMode.h"
#include "BoostedPlayerController.h"
#include "BoostedVehicle.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Border.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/SizeBox.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Styling/CoreStyle.h"

namespace
{
	const FLinearColor Money(0.24f, 1.f, 0.55f, 1.f);
	const FLinearColor Muted(0.62f, 0.65f, 0.7f, 1.f);
	const FLinearColor Hot(1.f, 0.18f, 0.33f, 1.f);
	const FLinearColor Gold(1.f, 0.79f, 0.29f, 1.f);

	UCanvasPanelSlot* Place(UCanvasPanel* Canvas, UWidget* W, const FAnchors& Anchors, const FVector2D& Alignment, const FVector2D& Pos)
	{
		UCanvasPanelSlot* S = Canvas->AddChildToCanvas(W);
		S->SetAnchors(Anchors);
		S->SetAlignment(Alignment);
		S->SetPosition(Pos);
		S->SetAutoSize(true);
		return S;
	}
}

TSharedRef<SWidget> UBoostedHUDWidget::RebuildWidget()
{
	if (WidgetTree && !WidgetTree->RootWidget)
	{
		BuildTree();
	}
	return Super::RebuildWidget();
}

UTextBlock* UBoostedHUDWidget::MakeText(int32 Size, const FLinearColor& Color, bool bBold)
{
	UTextBlock* T = WidgetTree->ConstructWidget<UTextBlock>(UTextBlock::StaticClass());
	T->SetFont(FCoreStyle::GetDefaultFontStyle(bBold ? "Bold" : "Regular", Size));
	T->SetColorAndOpacity(FSlateColor(Color));
	T->SetShadowOffset(FVector2D(1.5f, 1.5f));
	T->SetShadowColorAndOpacity(FLinearColor(0.f, 0.f, 0.f, 0.85f));
	return T;
}

UBorder* UBoostedHUDWidget::MakeBox(UWidget* Content, float Alpha)
{
	UBorder* B = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
	B->SetBrushColor(FLinearColor(0.f, 0.f, 0.f, Alpha));
	B->SetPadding(FMargin(14.f, 8.f));
	B->SetContent(Content);
	return B;
}

void UBoostedHUDWidget::BuildTree()
{
	Root = WidgetTree->ConstructWidget<UCanvasPanel>(UCanvasPanel::StaticClass(), TEXT("Root"));
	WidgetTree->RootWidget = Root;
	SetVisibility(ESlateVisibility::HitTestInvisible);

	// top right: cash, stars, cred
	UVerticalBox* TopRight = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	CashText = MakeText(36, Money);
	CredText = MakeText(12, Muted);
	CashText->SetJustification(ETextJustify::Right);
	CredText->SetJustification(ETextJustify::Right);
	TopRight->AddChildToVerticalBox(CashText)->SetHorizontalAlignment(HAlign_Right);
	// five wanted "stars" drawn as boxes (no special font glyphs needed)
	UHorizontalBox* StarRow = WidgetTree->ConstructWidget<UHorizontalBox>(UHorizontalBox::StaticClass());
	for (int32 i = 0; i < 5; ++i)
	{
		USizeBox* StarSize = WidgetTree->ConstructWidget<USizeBox>(USizeBox::StaticClass());
		StarSize->SetWidthOverride(18.f);
		StarSize->SetHeightOverride(18.f);
		UBorder* Star = WidgetTree->ConstructWidget<UBorder>(UBorder::StaticClass());
		Star->SetBrushColor(FLinearColor(1.f, 1.f, 1.f, 0.15f));
		StarSize->SetContent(Star);
		StarRow->AddChildToHorizontalBox(StarSize)->SetPadding(FMargin(5.f, 0.f, 0.f, 0.f));
		StarBoxes.Add(Star);
	}
	UVerticalBoxSlot* StarSlot = TopRight->AddChildToVerticalBox(StarRow);
	StarSlot->SetHorizontalAlignment(HAlign_Right);
	StarSlot->SetPadding(FMargin(0.f, 4.f, 0.f, 6.f));
	TopRight->AddChildToVerticalBox(CredText)->SetHorizontalAlignment(HAlign_Right);
	Place(Root, TopRight, FAnchors(1.f, 0.f), FVector2D(1.f, 0.f), FVector2D(-28.f, 20.f));

	// top centre: objective
	ObjectiveText = MakeText(15, FLinearColor::White);
	ObjectiveText->SetAutoWrapText(true);
	ObjectiveBox = MakeBox(ObjectiveText, 0.55f);
	Place(Root, ObjectiveBox, FAnchors(0.5f, 0.f), FVector2D(0.5f, 0.f), FVector2D(0.f, 20.f));

	// left: toasts
	Toasts = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	Place(Root, Toasts, FAnchors(0.f, 0.f), FVector2D(0.f, 0.f), FVector2D(28.f, 24.f));

	// left middle: evade meter
	EvadeBox = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	EvadeText = MakeText(13, Muted);
	EvadeBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
	EvadeBar->SetFillColorAndOpacity(FLinearColor(0.18f, 0.72f, 1.f));
	EvadeBox->AddChildToVerticalBox(EvadeText);
	EvadeBox->AddChildToVerticalBox(EvadeBar)->SetPadding(FMargin(0.f, 4.f, 0.f, 0.f));
	UCanvasPanelSlot* ES = Place(Root, EvadeBox, FAnchors(0.f, 0.5f), FVector2D(0.f, 0.5f), FVector2D(28.f, 0.f));
	ES->SetAutoSize(false);
	ES->SetSize(FVector2D(240.f, 50.f));

	// bottom centre: interaction prompt
	UVerticalBox* PromptCol = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	PromptText = MakeText(17, FLinearColor::White);
	PromptBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
	PromptBar->SetFillColorAndOpacity(Money);
	PromptCol->AddChildToVerticalBox(PromptText);
	PromptCol->AddChildToVerticalBox(PromptBar)->SetPadding(FMargin(0.f, 6.f, 0.f, 0.f));
	PromptBox = MakeBox(PromptCol, 0.65f);
	Place(Root, PromptBox, FAnchors(0.5f, 1.f), FVector2D(0.5f, 1.f), FVector2D(0.f, -170.f));

	// bottom right: speedometer
	Speedo = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	SpeedText = MakeText(64, FLinearColor::White);
	CarText = MakeText(15, FLinearColor::White);
	HealthBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
	NitroBar = WidgetTree->ConstructWidget<UProgressBar>(UProgressBar::StaticClass());
	NitroBar->SetFillColorAndOpacity(FLinearColor(0.18f, 0.72f, 1.f));
	for (UWidget* W : { static_cast<UWidget*>(SpeedText.Get()), static_cast<UWidget*>(CarText.Get()), static_cast<UWidget*>(HealthBar.Get()), static_cast<UWidget*>(NitroBar.Get()) })
	{
		UVerticalBoxSlot* VS = Speedo->AddChildToVerticalBox(W);
		VS->SetHorizontalAlignment(HAlign_Right);
		VS->SetPadding(FMargin(0.f, 3.f, 0.f, 0.f));
	}
	UCanvasPanelSlot* SS = Place(Root, Speedo, FAnchors(1.f, 1.f), FVector2D(1.f, 1.f), FVector2D(-30.f, -26.f));
	SS->SetAutoSize(false);
	SS->SetSize(FVector2D(300.f, 150.f));
	HealthBar->SetVisibility(ESlateVisibility::HitTestInvisible);

	// centre: banner
	UVerticalBox* BannerCol = WidgetTree->ConstructWidget<UVerticalBox>(UVerticalBox::StaticClass());
	BannerBig = MakeText(72, FLinearColor::White);
	BannerSub = MakeText(20, FLinearColor::White);
	BannerCol->AddChildToVerticalBox(BannerBig)->SetHorizontalAlignment(HAlign_Center);
	BannerCol->AddChildToVerticalBox(BannerSub)->SetHorizontalAlignment(HAlign_Center);
	Place(Root, BannerCol, FAnchors(0.5f, 0.32f), FVector2D(0.5f, 0.5f), FVector2D::ZeroVector);

	// bottom left: controls hint
	HintText = MakeText(12, Muted, false);
	Place(Root, HintText, FAnchors(0.f, 1.f), FVector2D(0.f, 1.f), FVector2D(28.f, -24.f));
}

void UBoostedHUDWidget::Toast(const FString& Text, const FLinearColor& Color)
{
	if (!Toasts)
	{
		TakeWidget();
	}
	UTextBlock* T = MakeText(15, Color);
	T->SetText(FText::FromString(Text));
	UBorder* Box = MakeBox(T, 0.65f);
	Toasts->AddChildToVerticalBox(Box)->SetPadding(FMargin(0.f, 0.f, 0.f, 6.f));
	ToastTimes.Emplace(Box, Clock + 4.5f);
	while (Toasts->GetChildrenCount() > 5)
	{
		Toasts->RemoveChildAt(0);
	}
}

void UBoostedHUDWidget::Banner(const FString& Big, const FString& Sub, const FLinearColor& Color, float Seconds)
{
	if (!BannerBig)
	{
		TakeWidget();
	}
	BannerBig->SetText(FText::FromString(Big.ToUpper()));
	BannerBig->SetColorAndOpacity(FSlateColor(Color));
	BannerSub->SetText(FText::FromString(Sub));
	BannerTime = Clock + Seconds;
}

void UBoostedHUDWidget::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
	Super::NativeTick(MyGeometry, InDeltaTime);
	Clock += InDeltaTime;
	for (int32 i = ToastTimes.Num() - 1; i >= 0; --i)
	{
		if (Clock > ToastTimes[i].Value || !ToastTimes[i].Key.IsValid())
		{
			if (UWidget* W = ToastTimes[i].Key.Get())
			{
				W->RemoveFromParent();
			}
			ToastTimes.RemoveAt(i);
		}
	}
	const bool bBanner = Clock < BannerTime;
	BannerBig->SetVisibility(bBanner ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	BannerSub->SetVisibility(bBanner ? ESlateVisibility::HitTestInvisible : ESlateVisibility::Collapsed);
	Refresh();
}

void UBoostedHUDWidget::Refresh()
{
	ABoostedPlayerController* PC = Cast<ABoostedPlayerController>(GetOwningPlayer());
	UBoostedGameInstance* GI = PC ? PC->GetGameInstance<UBoostedGameInstance>() : nullptr;
	ABoostedGameMode* GM = PC && PC->GetWorld() ? PC->GetWorld()->GetAuthGameMode<ABoostedGameMode>() : nullptr;
	if (!PC || !GI || !GM)
	{
		return;
	}
	const bool bInGame = GI->bInGame && !PC->IsMenuOpen();
	const ESlateVisibility Show = ESlateVisibility::HitTestInvisible;
	const ESlateVisibility Hide = ESlateVisibility::Collapsed;

	CashText->SetVisibility(GI->bInGame ? Show : Hide);
	CredText->SetVisibility(GI->bInGame ? Show : Hide);
	CashText->SetText(FText::FromString(BoostedEconomy::Money(GI->Cash)));
	const bool bFlash = GM->WantedFlash > 0.f && FMath::Fmod(Clock, 0.3f) < 0.15f;
	for (int32 i = 0; i < StarBoxes.Num(); ++i)
	{
		const bool bOn = i < GM->WantedLevel;
		StarBoxes[i]->SetBrushColor(bOn ? (bFlash ? Hot : FLinearColor::White) : FLinearColor(1.f, 1.f, 1.f, 0.15f));
		StarBoxes[i]->SetVisibility(GI->bInGame ? Show : Hide);
	}
	CredText->SetText(FText::FromString(FString::Printf(TEXT("STREET CRED LV %d"), GI->GetCredLevel())));

	const FString Objective = bInGame ? PC->GetObjective() : FString();
	ObjectiveText->SetText(FText::FromString(Objective));
	ObjectiveBox->SetVisibility(Objective.IsEmpty() ? Hide : Show);

	// prompt (on foot)
	ABoostedCharacter* Char = Cast<ABoostedCharacter>(PC->GetPawn());
	if (bInGame && Char && !Char->GetPromptText().IsEmpty())
	{
		PromptText->SetText(FText::FromString(FString::Printf(TEXT("[%s]  %s"), *Char->GetPromptKey(), *Char->GetPromptText())));
		const float P = Char->GetPromptProgress();
		PromptBar->SetVisibility(P >= 0.f ? Show : Hide);
		PromptBar->SetPercent(FMath::Clamp(P, 0.f, 1.f));
		PromptBox->SetVisibility(Show);
	}
	else
	{
		PromptBox->SetVisibility(Hide);
	}

	// evade meter
	if (bInGame && GM->WantedLevel > 0)
	{
		EvadeBox->SetVisibility(Show);
		const bool bBust = GM->BustTimer > 0.05f;
		EvadeText->SetText(FText::FromString(bBust ? TEXT("GETTING BUSTED...") : GM->bCopsSeePlayer ? TEXT("COPS SEE YOU") : TEXT("EVADING...")));
		EvadeText->SetColorAndOpacity(FSlateColor(bBust ? Hot : Muted));
		EvadeBar->SetPercent(GM->bCopsSeePlayer ? 0.f : FMath::Clamp(GM->EvadeTimer / GM->GetEvadeNeeded(), 0.f, 1.f));
	}
	else
	{
		EvadeBox->SetVisibility(Hide);
	}

	// speedometer
	ABoostedVehicle* V = Cast<ABoostedVehicle>(PC->GetPawn());
	if (bInGame && V)
	{
		Speedo->SetVisibility(Show);
		SpeedText->SetText(FText::FromString(FString::Printf(TEXT("%d MPH"), FMath::RoundToInt(V->GetSpeedMPH()))));
		const FString Tag = V->bOwned ? TEXT("YOURS") : V->bHot ? TEXT("HOT") : TEXT("CLEAN");
		CarText->SetText(FText::FromString(FString::Printf(TEXT("%s | %s | %d%%"), *V->GetDisplayName(), *Tag, FMath::RoundToInt(V->Health * 100.f))));
		CarText->SetColorAndOpacity(FSlateColor(V->bHot && !V->bOwned ? Hot : FLinearColor::White));
		HealthBar->SetPercent(V->Health);
		HealthBar->SetFillColorAndOpacity(FLinearColor::LerpUsingHSV(Hot, Money, V->Health));
		NitroBar->SetVisibility(V->Upgrades.Nitro > 0 ? Show : Hide);
		NitroBar->SetPercent(V->NitroFuel);
	}
	else
	{
		Speedo->SetVisibility(Hide);
	}

	HintText->SetVisibility(bInGame ? Show : Hide);
	HintText->SetText(FText::FromString(V
		? TEXT("W/S gas & brake | Space handbrake | Shift nitrous | E exit | H horn | Esc menu")
		: TEXT("WASD move | Shift sprint | Space jump | E steal / enter (hold to break in) | Esc menu")));
}
