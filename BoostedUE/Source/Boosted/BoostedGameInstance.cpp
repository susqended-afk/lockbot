#include "BoostedGameInstance.h"
#include "BoostedSaveGame.h"
#include "BoostedSettings.h"
#include "BoostedInputConfig.h"
#include "Kismet/GameplayStatics.h"

const TCHAR* UBoostedGameInstance::SlotName = TEXT("BoostedProfile");

UBoostedInputConfig* UBoostedGameInstance::GetInputConfig()
{
	if (!InputConfig)
	{
		InputConfig = NewObject<UBoostedInputConfig>(this);
		InputConfig->Build();
	}
	return InputConfig;
}

void UBoostedGameInstance::NewGame(const FCharacterLook& InLook)
{
	Cash = BoostedEconomy::StartingCash;
	XP = 0;
	Tutorial = 0;
	Look = InLook;
	Garage.Reset();
	Contracts.Reset();
	Stats = FBoostedStats();
	EnsureContracts();
	bInGame = true;
	SaveProfile();
}

bool UBoostedGameInstance::HasSave() const
{
	return UGameplayStatics::DoesSaveGameExist(SlotName, 0);
}

bool UBoostedGameInstance::LoadProfile()
{
	UBoostedSaveGame* Save = Cast<UBoostedSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
	if (!Save)
	{
		return false;
	}
	Cash = Save->Cash;
	XP = Save->XP;
	Tutorial = Save->Tutorial;
	Look = Save->Look;
	Garage = Save->Garage;
	Contracts = Save->Contracts;
	Stats = Save->Stats;
	EnsureContracts();
	bInGame = true;
	return true;
}

void UBoostedGameInstance::SaveProfile()
{
	UBoostedSaveGame* Save = Cast<UBoostedSaveGame>(UGameplayStatics::CreateSaveGameObject(UBoostedSaveGame::StaticClass()));
	if (!Save)
	{
		return;
	}
	Save->Cash = Cash;
	Save->XP = XP;
	Save->Tutorial = Tutorial;
	Save->Look = Look;
	Save->Garage = Garage;
	Save->Contracts = Contracts;
	Save->Stats = Stats;
	UGameplayStatics::SaveGameToSlot(Save, SlotName, 0);
}

int32 UBoostedGameInstance::GetCredLevel() const
{
	return BoostedEconomy::CredLevel(XP);
}

bool UBoostedGameInstance::AddXP(int32 Amount)
{
	const int32 Before = GetCredLevel();
	XP += Amount;
	return GetCredLevel() > Before;
}

// ---------------------------------------------------------------------- boost list

void UBoostedGameInstance::EnsureContracts()
{
	while (Contracts.Num() < 3)
	{
		Contracts.Add(MakeContract());
	}
}

FBoostContract UBoostedGameInstance::MakeContract() const
{
	static const TCHAR* Buyers[] = { TEXT("Big Moe"), TEXT("Auntie Pat"), TEXT("Cuz from Detroit"), TEXT("Lil Tez"), TEXT("OG Ray"), TEXT("Mr. Kim"), TEXT("Dre"), TEXT("Santana"), TEXT("Yolanda"), TEXT("Smokey") };
	const UBoostedSettings* S = UBoostedSettings::Get();
	FBoostContract C;
	C.Buyer = Buyers[FMath::RandRange(0, UE_ARRAY_COUNT(Buyers) - 1)];

	// rarer, pricier cars are more likely to be requested
	float Total = 0.f;
	TArray<TPair<FName, float>> Weights;
	for (const FBoostedCarModel& M : S->Cars)
	{
		if (M.Rarity <= 0.f)
		{
			continue;
		}
		const float W = FMath::Max(2.f, 30.f - M.Rarity) + (M.Value > 20000 ? 6.f : 0.f);
		Weights.Emplace(M.Id, W);
		Total += W;
	}
	float R = FMath::FRand() * Total;
	for (const TPair<FName, float>& W : Weights)
	{
		R -= W.Value;
		C.ModelId = W.Key;
		if (R <= 0.f)
		{
			break;
		}
	}

	const int32 Level = GetCredLevel();
	const FBoostedCarModel* Model = S->FindCar(C.ModelId);
	float Reward = (Model ? Model->Value : 10000) * 1.25f;
	if (S->Paints.Num() > 0 && FMath::FRand() < 0.45f)
	{
		C.PaintIndex = FMath::RandRange(0, S->Paints.Num() - 1);
		Reward += 1200.f;
	}
	if (FMath::FRand() < 0.25f + Level * 0.08f)
	{
		C.MinEngine = FMath::Clamp(1 + FMath::RandRange(0, FMath::Min(2, Level - 1)), 1, 3);
		static const float EngineBonus[] = { 0.f, 3500.f, 10000.f, 22000.f };
		Reward += EngineBonus[C.MinEngine];
	}
	if (FMath::FRand() < 0.25f)
	{
		C.bRequireFinish = true;
		C.Finish = static_cast<EPaintFinish>(FMath::RandRange(1, 3));
		Reward += BoostedEconomy::FinishCost(C.Finish) * 1.5f;
	}
	if (Level >= 3 && FMath::FRand() < 0.15f)
	{
		C.bRequireBlower = true;
		Reward += 20000.f;
	}
	C.Reward = FMath::RoundToInt(Reward / 100.f) * 100;
	return C;
}

void UBoostedGameInstance::CompleteContract(int32 Index)
{
	if (Contracts.IsValidIndex(Index))
	{
		Contracts[Index] = MakeContract();
	}
}

TArray<FString> UBoostedGameInstance::DescribeContract(const FBoostContract& C) const
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	TArray<FString> Out;
	Out.Add(CarName(C.ModelId));
	if (S->Paints.IsValidIndex(C.PaintIndex))
	{
		Out.Add(S->Paints[C.PaintIndex].Name + TEXT(" paint"));
	}
	if (C.bRequireFinish)
	{
		Out.Add(BoostedEconomy::FinishName(C.Finish) + TEXT(" finish"));
	}
	if (C.MinEngine > 0)
	{
		Out.Add(FString::Printf(TEXT("Engine Stage %d+"), C.MinEngine));
	}
	if (C.bRequireBlower)
	{
		Out.Add(TEXT("Pro-Mod Blower"));
	}
	return Out;
}

TArray<FString> UBoostedGameInstance::MissingForContract(const FBoostContract& C, FName ModelId, const FCarUpgrades& U) const
{
	const UBoostedSettings* S = UBoostedSettings::Get();
	TArray<FString> Out;
	if (ModelId != C.ModelId)
	{
		Out.Add(TEXT("wrong model"));
		return Out;
	}
	if (C.PaintIndex >= 0 && U.PaintIndex != C.PaintIndex && S->Paints.IsValidIndex(C.PaintIndex))
	{
		Out.Add(S->Paints[C.PaintIndex].Name + TEXT(" paint"));
	}
	if (C.bRequireFinish && U.Finish != C.Finish)
	{
		Out.Add(BoostedEconomy::FinishName(C.Finish) + TEXT(" finish"));
	}
	if (U.Engine < C.MinEngine)
	{
		Out.Add(FString::Printf(TEXT("Engine Stage %d"), C.MinEngine));
	}
	if (C.bRequireBlower && U.Blower == 0)
	{
		Out.Add(TEXT("Blower"));
	}
	return Out;
}

int32 UBoostedGameInstance::FindBestContract(FName ModelId, const FCarUpgrades& U) const
{
	int32 Best = INDEX_NONE;
	for (int32 i = 0; i < Contracts.Num(); ++i)
	{
		if (MissingForContract(Contracts[i], ModelId, U).Num() == 0 && (Best == INDEX_NONE || Contracts[i].Reward > Contracts[Best].Reward))
		{
			Best = i;
		}
	}
	return Best;
}

// ---------------------------------------------------------------------- prices

int32 UBoostedGameInstance::CarValue(FName ModelId, const FCarUpgrades& U, float Health)
{
	const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(ModelId);
	const float Base = M ? M->Value : 8000.f;
	return FMath::RoundToInt(Base * (0.45f + 0.55f * FMath::Clamp(Health, 0.f, 1.f)) + BoostedEconomy::UpgradeSpend(U) * 0.8f);
}

int32 UBoostedGameInstance::ChopPrice(FName ModelId, const FCarUpgrades& U, float Health)
{
	const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(ModelId);
	const float Base = M ? M->Value : 8000.f;
	const float Parts = Base * (0.45f + 0.55f * FMath::Clamp(Health, 0.f, 1.f)) * 0.5f + BoostedEconomy::UpgradeSpend(U) * 0.3f;
	return FMath::RoundToInt(Parts / 10.f) * 10;
}

int32 UBoostedGameInstance::ExportPrice(FName ModelId, const FCarUpgrades& U, float Health, bool bHot)
{
	const float Value = CarValue(ModelId, U, Health) * (bHot ? 0.65f : 1.f);
	return FMath::RoundToInt(Value / 10.f) * 10;
}

int32 UBoostedGameInstance::RepairCost(FName ModelId, float Health)
{
	const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(ModelId);
	const float Base = M ? M->Value : 8000.f;
	return FMath::RoundToInt((1.f - FMath::Clamp(Health, 0.f, 1.f)) * Base * 0.12f / 10.f) * 10;
}

FString UBoostedGameInstance::CarName(FName ModelId)
{
	const FBoostedCarModel* M = UBoostedSettings::Get()->FindCar(ModelId);
	return M ? M->GetDisplayName() : ModelId.ToString();
}
