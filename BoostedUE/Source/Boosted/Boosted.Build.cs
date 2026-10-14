using UnrealBuildTool;

public class Boosted : ModuleRules
{
	public Boosted(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		// Lets files in subfolders (UI/) include headers like "BoostedVehicle.h" and "UI/BoostedButton.h".
		PublicIncludePaths.Add(ModuleDirectory);

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput",
			"ChaosVehicles", "PhysicsCore", "UMG", "Slate", "SlateCore",
			"AIModule", "DeveloperSettings"
		});
	}
}
