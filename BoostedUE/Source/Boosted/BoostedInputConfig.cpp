#include "BoostedInputConfig.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputModifiers.h"

UInputAction* UBoostedInputConfig::MakeAction(const TCHAR* Name, EInputActionValueType Type)
{
	UInputAction* Action = NewObject<UInputAction>(this, FName(Name));
	Action->ValueType = Type;
	return Action;
}

void UBoostedInputConfig::Map(UInputMappingContext* Context, UInputAction* Action, const FKey& Key, bool bSwizzle, bool bNegateX, bool bNegateY, float Scale, bool bDeadZone)
{
	FEnhancedActionKeyMapping& Mapping = Context->MapKey(Action, Key);
	if (bDeadZone)
	{
		Mapping.Modifiers.Add(NewObject<UInputModifierDeadZone>(this));
	}
	if (bSwizzle)
	{
		UInputModifierSwizzleAxis* Swizzle = NewObject<UInputModifierSwizzleAxis>(this);
		Swizzle->Order = EInputAxisSwizzle::YXZ;
		Mapping.Modifiers.Add(Swizzle);
	}
	if (bNegateX || bNegateY)
	{
		UInputModifierNegate* Negate = NewObject<UInputModifierNegate>(this);
		Negate->bX = bNegateX;
		Negate->bY = bNegateY;
		Negate->bZ = false;
		Mapping.Modifiers.Add(Negate);
	}
	if (!FMath::IsNearlyEqual(Scale, 1.f))
	{
		UInputModifierScalar* Scalar = NewObject<UInputModifierScalar>(this);
		Scalar->Scalar = FVector(Scale, Scale, 1.f);
		Mapping.Modifiers.Add(Scalar);
	}
}

void UBoostedInputConfig::Build()
{
	Move = MakeAction(TEXT("IA_Move"), EInputActionValueType::Axis2D);
	Look = MakeAction(TEXT("IA_Look"), EInputActionValueType::Axis2D);
	Jump = MakeAction(TEXT("IA_Jump"), EInputActionValueType::Boolean);
	Sprint = MakeAction(TEXT("IA_Sprint"), EInputActionValueType::Boolean);
	Interact = MakeAction(TEXT("IA_Interact"), EInputActionValueType::Boolean);
	Throttle = MakeAction(TEXT("IA_Throttle"), EInputActionValueType::Axis1D);
	Brake = MakeAction(TEXT("IA_Brake"), EInputActionValueType::Axis1D);
	Steer = MakeAction(TEXT("IA_Steer"), EInputActionValueType::Axis1D);
	Handbrake = MakeAction(TEXT("IA_Handbrake"), EInputActionValueType::Boolean);
	Nitro = MakeAction(TEXT("IA_Nitro"), EInputActionValueType::Boolean);
	Horn = MakeAction(TEXT("IA_Horn"), EInputActionValueType::Boolean);
	Pause = MakeAction(TEXT("IA_Pause"), EInputActionValueType::Boolean);
	Pause->bTriggerWhenPaused = true;

	// ---------------------------------------------------------------- on foot
	OnFootContext = NewObject<UInputMappingContext>(this, TEXT("IMC_OnFoot"));
	Map(OnFootContext, Move, EKeys::W, true);
	Map(OnFootContext, Move, EKeys::S, true, false, true);
	Map(OnFootContext, Move, EKeys::D);
	Map(OnFootContext, Move, EKeys::A, false, true);
	Map(OnFootContext, Move, EKeys::Up, true);
	Map(OnFootContext, Move, EKeys::Down, true, false, true);
	Map(OnFootContext, Move, EKeys::Right);
	Map(OnFootContext, Move, EKeys::Left, false, true);
	Map(OnFootContext, Move, EKeys::Gamepad_Left2D, false, false, false, 1.f, true);
	Map(OnFootContext, Look, EKeys::Mouse2D, false, false, true);
	Map(OnFootContext, Look, EKeys::Gamepad_Right2D, false, false, true, 2.5f, true);
	Map(OnFootContext, Jump, EKeys::SpaceBar);
	Map(OnFootContext, Jump, EKeys::Gamepad_FaceButton_Bottom);
	Map(OnFootContext, Sprint, EKeys::LeftShift);
	Map(OnFootContext, Sprint, EKeys::Gamepad_FaceButton_Right);
	Map(OnFootContext, Interact, EKeys::E);
	Map(OnFootContext, Interact, EKeys::F);
	Map(OnFootContext, Interact, EKeys::Gamepad_FaceButton_Top);

	// ---------------------------------------------------------------- driving
	DrivingContext = NewObject<UInputMappingContext>(this, TEXT("IMC_Driving"));
	Map(DrivingContext, Throttle, EKeys::W);
	Map(DrivingContext, Throttle, EKeys::Up);
	Map(DrivingContext, Throttle, EKeys::Gamepad_RightTriggerAxis);
	Map(DrivingContext, Brake, EKeys::S);
	Map(DrivingContext, Brake, EKeys::Down);
	Map(DrivingContext, Brake, EKeys::Gamepad_LeftTriggerAxis);
	Map(DrivingContext, Steer, EKeys::D);
	Map(DrivingContext, Steer, EKeys::Right);
	Map(DrivingContext, Steer, EKeys::A, false, true);
	Map(DrivingContext, Steer, EKeys::Left, false, true);
	Map(DrivingContext, Steer, EKeys::Gamepad_LeftX, false, false, false, 1.f, true);
	Map(DrivingContext, Handbrake, EKeys::SpaceBar);
	Map(DrivingContext, Handbrake, EKeys::Gamepad_FaceButton_Bottom);
	Map(DrivingContext, Nitro, EKeys::LeftShift);
	Map(DrivingContext, Nitro, EKeys::Gamepad_FaceButton_Right);
	Map(DrivingContext, Interact, EKeys::E);
	Map(DrivingContext, Interact, EKeys::F);
	Map(DrivingContext, Interact, EKeys::Gamepad_FaceButton_Top);
	Map(DrivingContext, Horn, EKeys::H);
	Map(DrivingContext, Horn, EKeys::Gamepad_LeftThumbstick);
	Map(DrivingContext, Look, EKeys::Mouse2D, false, false, true);
	Map(DrivingContext, Look, EKeys::Gamepad_Right2D, false, false, true, 2.5f, true);

	// ---------------------------------------------------------------- global
	GlobalContext = NewObject<UInputMappingContext>(this, TEXT("IMC_Global"));
	Map(GlobalContext, Pause, EKeys::Escape);
	Map(GlobalContext, Pause, EKeys::P);
	Map(GlobalContext, Pause, EKeys::Gamepad_Special_Right);
}
