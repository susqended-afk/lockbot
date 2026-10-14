#include "BoostedParts.h"
#include "Camera/CameraComponent.h"
#include "Components/PrimitiveComponent.h"
#include "Engine/BlueprintGeneratedClass.h"
#include "Engine/SCS_Node.h"
#include "Engine/SimpleConstructionScript.h"
#include "GameFramework/Actor.h"
#include "GameFramework/SpringArmComponent.h"

TArray<UActorComponent*> BoostedParts::CopyBlueprintParts(AActor* To, UClass* Source, USceneComponent* AttachTo)
{
	TArray<UActorComponent*> Made;
	UBlueprintGeneratedClass* Actual = Cast<UBlueprintGeneratedClass>(Source);
	if (!To || !Actual || !AttachTo)
	{
		return Made;
	}
	// base Blueprint first, so parent parts exist before the parts attached to them
	TArray<UBlueprintGeneratedClass*> Chain;
	for (UClass* C = Source; C; C = C->GetSuperClass())
	{
		if (UBlueprintGeneratedClass* BP = Cast<UBlueprintGeneratedClass>(C))
		{
			Chain.Insert(BP, 0);
		}
	}
	TMap<FName, USceneComponent*> ByName;
	TFunction<void(USCS_Node*, USceneComponent*)> AddPart;
	AddPart = [&](USCS_Node* Node, USceneComponent* Parent)
	{
		// a child Blueprint can override a parent's part; this returns the version Source actually uses
		UActorComponent* Template = Node ? Node->GetActualComponentTemplate(Actual) : nullptr;
		if (!Template || Template->IsA<UCameraComponent>() || Template->IsA<USpringArmComponent>())
		{
			return;
		}
		USceneComponent* SceneTemplate = Cast<USceneComponent>(Template);
		// of the non-visual components only LOD sync is wanted (MetaHumans use it to keep body, face and hair in step)
		if (!SceneTemplate && !Template->GetClass()->GetName().Contains(TEXT("LODSync")))
		{
			return;
		}
		UActorComponent* Part = To->CreateComponentFromTemplate(Template, Node->GetVariableName());
		if (!Part)
		{
			return;
		}
		USceneComponent* ScenePart = Cast<USceneComponent>(Part);
		if (ScenePart)
		{
			ScenePart->SetupAttachment(Parent, Node->AttachToName);
		}
		// looks only: the actor's own body/capsule does the colliding
		if (UPrimitiveComponent* Prim = Cast<UPrimitiveComponent>(Part))
		{
			Prim->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		}
		Part->CreationMethod = EComponentCreationMethod::Instance;
		To->AddInstanceComponent(Part);
		Part->RegisterComponent();
		Made.Add(Part);
		if (ScenePart)
		{
			ByName.Add(Node->GetVariableName(), ScenePart);
			for (USCS_Node* Child : Node->GetChildNodes())
			{
				AddPart(Child, ScenePart);
			}
		}
	};
	for (UBlueprintGeneratedClass* BP : Chain)
	{
		if (!BP->SimpleConstructionScript)
		{
			continue;
		}
		for (USCS_Node* Root : BP->SimpleConstructionScript->GetRootNodes())
		{
			// parts on an inherited native component (e.g. a vehicle's mesh) or at the top go on AttachTo
			USceneComponent* const* Parent = ByName.Find(Root->ParentComponentOrVariableName);
			AddPart(Root, Parent ? *Parent : AttachTo);
		}
	}
	return Made;
}
