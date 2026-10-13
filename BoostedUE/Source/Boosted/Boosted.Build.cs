using UnrealBuildTool;

public class Boosted : ModuleRules
{
	public Boosted(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput",
			"ChaosVehicles", "PhysicsCore", "UMG", "Slate", "SlateCore",
			"AIModule", "DeveloperSettings"
		});
	}
}
