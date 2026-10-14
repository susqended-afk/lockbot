// Copies the parts a Blueprint adds in its Components panel onto another actor. This is how BOOSTED uses
// the Vehicle template cars and MetaHumans as they come, without reparenting or editing their Blueprints.
#pragma once

#include "CoreMinimal.h"

class AActor;
class UActorComponent;
class USceneComponent;

namespace BoostedParts
{
	/**
	 * Recreates Source's Blueprint-added components (meshes, grooms, lights...) on To, with the same names,
	 * attachments, sockets and settings. Parts at the top of Source's hierarchy attach to AttachTo.
	 * Cameras and spring arms are skipped, and the copies don't collide. Returns the new components.
	 */
	BOOSTED_API TArray<UActorComponent*> CopyBlueprintParts(AActor* To, UClass* Source, USceneComponent* AttachTo);
}
