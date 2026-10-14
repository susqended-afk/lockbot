#include "BoostedTypes.h"

DEFINE_LOG_CATEGORY(LogBoosted);

int32 FCarUpgrades::GetLevel(EBoostedUpgrade Type) const
{
	switch (Type)
	{
	case EBoostedUpgrade::Engine: return Engine;
	case EBoostedUpgrade::Blower: return Blower;
	case EBoostedUpgrade::Tires: return Tires;
	case EBoostedUpgrade::Suspension: return Suspension;
	case EBoostedUpgrade::Brakes: return Brakes;
	case EBoostedUpgrade::Nitro: return Nitro;
	case EBoostedUpgrade::Armor: return Armor;
	}
	return 0;
}

void FCarUpgrades::SetLevel(EBoostedUpgrade Type, int32 Level)
{
	Level = FMath::Clamp(Level, 0, BoostedEconomy::MaxLevel(Type));
	switch (Type)
	{
	case EBoostedUpgrade::Engine: Engine = Level; break;
	case EBoostedUpgrade::Blower: Blower = Level; break;
	case EBoostedUpgrade::Tires: Tires = Level; break;
	case EBoostedUpgrade::Suspension: Suspension = Level; break;
	case EBoostedUpgrade::Brakes: Brakes = Level; break;
	case EBoostedUpgrade::Nitro: Nitro = Level; break;
	case EBoostedUpgrade::Armor: Armor = Level; break;
	}
}

namespace
{
	struct FTier
	{
		const TCHAR* Name;
		int32 Cost;
		int32 Cred;
	};

	const TArray<FTier>& Tiers(EBoostedUpgrade Type)
	{
		static const TArray<FTier> Engine = { { TEXT("Stock"), 0, 1 }, { TEXT("Stage 1"), 3000, 1 }, { TEXT("Stage 2"), 7500, 2 }, { TEXT("Stage 3"), 16000, 4 } };
		static const TArray<FTier> Blower = { { TEXT("None"), 0, 1 }, { TEXT("Pro-Mod Blower"), 14000, 3 } };
		static const TArray<FTier> Tires = { { TEXT("Stock"), 0, 1 }, { TEXT("Street"), 1500, 1 }, { TEXT("Sport"), 3200, 1 }, { TEXT("Drag Radials"), 6000, 2 } };
		static const TArray<FTier> Suspension = { { TEXT("Stock"), 0, 1 }, { TEXT("Lowered"), 1200, 1 }, { TEXT("Coilovers"), 2800, 1 }, { TEXT("Air Ride"), 5500, 2 } };
		static const TArray<FTier> Brakes = { { TEXT("Stock"), 0, 1 }, { TEXT("Street"), 1000, 1 }, { TEXT("Big Brake Kit"), 3500, 2 } };
		static const TArray<FTier> Nitro = { { TEXT("None"), 0, 1 }, { TEXT("10 lb Shot"), 4000, 1 }, { TEXT("20 lb Shot"), 8000, 2 }, { TEXT("35 lb Shot"), 15000, 3 } };
		static const TArray<FTier> Armor = { { TEXT("None"), 0, 1 }, { TEXT("20%"), 3000, 1 }, { TEXT("40%"), 6500, 2 }, { TEXT("60%"), 12000, 3 } };
		switch (Type)
		{
		case EBoostedUpgrade::Engine: return Engine;
		case EBoostedUpgrade::Blower: return Blower;
		case EBoostedUpgrade::Tires: return Tires;
		case EBoostedUpgrade::Suspension: return Suspension;
		case EBoostedUpgrade::Brakes: return Brakes;
		case EBoostedUpgrade::Nitro: return Nitro;
		case EBoostedUpgrade::Armor: return Armor;
		}
		return Engine;
	}
}

const TArray<EBoostedUpgrade>& BoostedEconomy::AllUpgrades()
{
	static const TArray<EBoostedUpgrade> All = {
		EBoostedUpgrade::Engine, EBoostedUpgrade::Blower, EBoostedUpgrade::Tires, EBoostedUpgrade::Suspension,
		EBoostedUpgrade::Brakes, EBoostedUpgrade::Nitro, EBoostedUpgrade::Armor };
	return All;
}

FString BoostedEconomy::UpgradeName(EBoostedUpgrade Type)
{
	switch (Type)
	{
	case EBoostedUpgrade::Engine: return TEXT("Engine");
	case EBoostedUpgrade::Blower: return TEXT("Blower");
	case EBoostedUpgrade::Tires: return TEXT("Tires");
	case EBoostedUpgrade::Suspension: return TEXT("Suspension");
	case EBoostedUpgrade::Brakes: return TEXT("Brakes");
	case EBoostedUpgrade::Nitro: return TEXT("Nitrous");
	case EBoostedUpgrade::Armor: return TEXT("Armor");
	}
	return FString();
}

int32 BoostedEconomy::MaxLevel(EBoostedUpgrade Type)
{
	return Tiers(Type).Num() - 1;
}

FString BoostedEconomy::LevelName(EBoostedUpgrade Type, int32 Level)
{
	const TArray<FTier>& T = Tiers(Type);
	return T.IsValidIndex(Level) ? FString(T[Level].Name) : FString();
}

int32 BoostedEconomy::LevelCost(EBoostedUpgrade Type, int32 Level)
{
	const TArray<FTier>& T = Tiers(Type);
	return T.IsValidIndex(Level) ? T[Level].Cost : 0;
}

int32 BoostedEconomy::CredRequired(EBoostedUpgrade Type, int32 Level)
{
	const TArray<FTier>& T = Tiers(Type);
	return T.IsValidIndex(Level) ? T[Level].Cred : 1;
}

FString BoostedEconomy::FinishName(EPaintFinish Finish)
{
	switch (Finish)
	{
	case EPaintFinish::Gloss: return TEXT("Gloss");
	case EPaintFinish::Metallic: return TEXT("Metallic");
	case EPaintFinish::Matte: return TEXT("Matte");
	case EPaintFinish::Pearl: return TEXT("Pearl");
	case EPaintFinish::Chrome: return TEXT("Chrome");
	}
	return FString();
}

int32 BoostedEconomy::FinishCost(EPaintFinish Finish)
{
	switch (Finish)
	{
	case EPaintFinish::Gloss: return 0;
	case EPaintFinish::Metallic: return 800;
	case EPaintFinish::Matte: return 1500;
	case EPaintFinish::Pearl: return 3000;
	case EPaintFinish::Chrome: return 9000;
	}
	return 0;
}

int32 BoostedEconomy::UpgradeSpend(const FCarUpgrades& U)
{
	int32 Total = 0;
	for (EBoostedUpgrade Type : AllUpgrades())
	{
		for (int32 L = 1; L <= U.GetLevel(Type); ++L)
		{
			Total += LevelCost(Type, L);
		}
	}
	Total += FinishCost(U.Finish);
	if (U.bUnderglow)
	{
		Total += UnderglowCost;
	}
	return Total;
}

int32 BoostedEconomy::CredLevel(int32 XP)
{
	// Level n needs 500 * n * (n - 1) XP: 1 -> 0, 2 -> 1000, 3 -> 3000, 4 -> 6000 ...
	return FMath::FloorToInt((1.f + FMath::Sqrt(1.f + FMath::Max(0, XP) / 125.f)) / 2.f);
}

int32 BoostedEconomy::XPForLevel(int32 Level)
{
	return 500 * Level * (Level - 1);
}

FString BoostedEconomy::Money(int32 Amount)
{
	return (Amount < 0 ? TEXT("-$") : TEXT("$")) + FString::FormatAsNumber(FMath::Abs(Amount));
}

FString BoostedEconomy::RandomPlate()
{
	static const TCHAR* Letters = TEXT("ABCDEFGHJKLMNPRSTUVWXYZ");
	FString Plate;
	for (int32 i = 0; i < 3; ++i)
	{
		Plate.AppendChar(Letters[FMath::RandRange(0, 22)]);
	}
	Plate += FString::Printf(TEXT(" %04d"), FMath::RandRange(1000, 9999));
	return Plate;
}
