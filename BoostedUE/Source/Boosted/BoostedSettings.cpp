#include "BoostedSettings.h"
#include "BoostedVehicle.h"

namespace
{
	FLinearColor Hex(const TCHAR* InHex)
	{
		return FLinearColor::FromSRGBColor(FColor::FromHex(InHex));
	}

	FBoostedCarModel Car(const TCHAR* Id, const TCHAR* Make, const TCHAR* Model, int32 Value, float Rarity, float Perf, std::initializer_list<const TCHAR*> Colors)
	{
		FBoostedCarModel C;
		C.Id = Id;
		C.Make = Make;
		C.Model = Model;
		C.Value = Value;
		C.Rarity = Rarity;
		C.PerformanceScale = Perf;
		for (const TCHAR* Col : Colors)
		{
			C.FactoryColors.Add(Hex(Col));
		}
		return C;
	}

	FPaintOption Paint(const TCHAR* Name, const TCHAR* InHex)
	{
		FPaintOption P;
		P.Name = Name;
		P.Color = Hex(InHex);
		return P;
	}
}

UBoostedSettings::UBoostedSettings()
{
	// Fictional parody models (real makes need licensing before a Steam release).
	Cars.Add(Car(TEXT("hellhound"), TEXT("Stallion"), TEXT("Hellhound SRT"), 32000, 6.f, 1.35f, { TEXT("4A1F78"), TEXT("5CCC2E"), TEXT("FF6A13"), TEXT("0C0C0F"), TEXT("E9E9EA"), TEXT("A8101A") }));
	Cars.Add(Car(TEXT("scatpack"), TEXT("Stallion"), TEXT("Scat Pack"), 23000, 10.f, 1.15f, { TEXT("0C0C0F"), TEXT("A8101A"), TEXT("E9E9EA"), TEXT("2C3A52") }));
	Cars.Add(Car(TEXT("trackhound"), TEXT("Stallion"), TEXT("Trackhound"), 38000, 5.f, 1.3f, { TEXT("0C0C0F"), TEXT("E9E9EA"), TEXT("A8101A"), TEXT("3A4048") }));
	Cars.Add(Car(TEXT("kaiser"), TEXT("Kaiser"), TEXT("750 Li"), 27000, 9.f, 1.1f, { TEXT("0C0C0F"), TEXT("1A2233"), TEXT("E9E9EA"), TEXT("5A5F66") }));
	Cars.Add(Car(TEXT("raiden"), TEXT("Nakamura"), TEXT("Raiden GT-X"), 55000, 3.f, 1.45f, { TEXT("E9E9EA"), TEXT("0C0C0F"), TEXT("2A5BD7"), TEXT("F2C200") }));
	Cars.Add(Car(TEXT("royale"), TEXT("Cortez"), TEXT("Royale Caprice"), 16000, 9.f, 0.9f, { TEXT("FF2A6D"), TEXT("00A6A6"), TEXT("FFD400"), TEXT("8A2BE2"), TEXT("1BC45A") }));
	Cars.Add(Car(TEXT("workhorse"), TEXT("Cortez"), TEXT("Workhorse 1500"), 13000, 16.f, 0.85f, { TEXT("E9E9EA"), TEXT("0C0C0F"), TEXT("8A1C1C"), TEXT("1E3A6B") }));
	Cars.Add(Car(TEXT("civi"), TEXT("Hikari"), TEXT("Civi Si"), 7500, 26.f, 0.7f, { TEXT("E9E9EA"), TEXT("0C0C0F"), TEXT("A8101A"), TEXT("2A5BD7"), TEXT("7B8087") }));
	Cars.Add(Car(TEXT("camri"), TEXT("Sakura"), TEXT("Camri LE"), 9500, 26.f, 0.7f, { TEXT("E9E9EA"), TEXT("9AA0A6"), TEXT("5A5F66"), TEXT("1A2233") }));
	FBoostedCarModel Police = Car(TEXT("interceptor"), TEXT("Marshal"), TEXT("Interceptor"), 21000, 0.f, 1.2f, { TEXT("0C0C0F") });
	Cars.Add(Police);

	Paints = {
		Paint(TEXT("Plum Crazy"), TEXT("4A1F78")), Paint(TEXT("Sublime"), TEXT("5CCC2E")), Paint(TEXT("Go Mango"), TEXT("FF6A13")),
		Paint(TEXT("Torred"), TEXT("A8101A")), Paint(TEXT("Pitch Black"), TEXT("0C0C0F")), Paint(TEXT("White Knuckle"), TEXT("E9E9EA")),
		Paint(TEXT("Destroyer Gray"), TEXT("4C5259")), Paint(TEXT("Indigo"), TEXT("123B8C")), Paint(TEXT("Candy Pink"), TEXT("FF2A6D")),
		Paint(TEXT("Teal Drip"), TEXT("00A6A6")), Paint(TEXT("Lemon"), TEXT("FFD400")), Paint(TEXT("Grape"), TEXT("8A2BE2")),
		Paint(TEXT("Money Green"), TEXT("1D6B3A")), Paint(TEXT("Sky"), TEXT("4FA8FF")), Paint(TEXT("Bronze"), TEXT("8A5A2B")),
		Paint(TEXT("Gold Rush"), TEXT("C9A227")),
	};

	ClothingColors = {
		Paint(TEXT("Black"), TEXT("111111")), Paint(TEXT("White"), TEXT("F2F2F2")), Paint(TEXT("Heather Gray"), TEXT("7D8288")),
		Paint(TEXT("Navy"), TEXT("2B3A55")), Paint(TEXT("Forest"), TEXT("1D3B2A")), Paint(TEXT("Burgundy"), TEXT("6B1D1D")),
		Paint(TEXT("Red"), TEXT("C41E3A")), Paint(TEXT("Orange"), TEXT("FF7A00")), Paint(TEXT("Yellow"), TEXT("FFD100")),
		Paint(TEXT("Royal Blue"), TEXT("3A7BD5")), Paint(TEXT("Purple"), TEXT("8A2BE2")), Paint(TEXT("Pink"), TEXT("FF4FA3")),
		Paint(TEXT("Wheat"), TEXT("C2A878")), Paint(TEXT("Brown"), TEXT("4B3621")), Paint(TEXT("Teal"), TEXT("00A3A3")),
		Paint(TEXT("Olive"), TEXT("5A6B3A")),
	};
	ClothingColorParameters = { TEXT("Color"), TEXT("BaseColor"), TEXT("Base Color"), TEXT("Tint"), TEXT("ClothColor"), TEXT("Primary Color"), TEXT("PrimaryColor") };

	// UE5 Third Person template mannequin (newer and older content paths).
	FallbackCharacterMeshes = {
		FSoftObjectPath(TEXT("/Game/Characters/Mannequins/Meshes/SKM_Manny_Simple.SKM_Manny_Simple")),
		FSoftObjectPath(TEXT("/Game/Characters/Mannequins/Meshes/SKM_Manny.SKM_Manny")),
		FSoftObjectPath(TEXT("/Game/Characters/Mannequins/Meshes/SKM_Quinn_Simple.SKM_Quinn_Simple")),
	};
	FallbackAnimClasses = {
		FSoftClassPath(TEXT("/Game/Characters/Mannequins/Anims/Unarmed/ABP_Unarmed.ABP_Unarmed_C")),
		FSoftClassPath(TEXT("/Game/Characters/Mannequins/Animations/ABP_Manny.ABP_Manny_C")),
		FSoftClassPath(TEXT("/Game/Characters/Mannequins/Animations/ABP_Quinn.ABP_Quinn_C")),
	};
}

const FBoostedCarModel* UBoostedSettings::FindCar(FName Id) const
{
	return Cars.FindByPredicate([Id](const FBoostedCarModel& C) { return C.Id == Id; });
}

TSubclassOf<ABoostedVehicle> UBoostedSettings::ResolveVehicleClass(FName Id) const
{
	if (const FBoostedCarModel* Model = FindCar(Id))
	{
		if (!Model->VehicleClass.IsNull())
		{
			if (UClass* Cls = Model->VehicleClass.LoadSynchronous())
			{
				return Cls;
			}
		}
	}
	return DefaultVehicleClass.IsNull() ? nullptr : DefaultVehicleClass.LoadSynchronous();
}

TSubclassOf<ABoostedVehicle> UBoostedSettings::ResolvePoliceClass() const
{
	if (!PoliceVehicleClass.IsNull())
	{
		if (UClass* Cls = PoliceVehicleClass.LoadSynchronous())
		{
			return Cls;
		}
	}
	return ResolveVehicleClass(TEXT("interceptor"));
}
