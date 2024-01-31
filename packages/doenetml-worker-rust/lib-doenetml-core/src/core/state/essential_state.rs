use std::collections::HashMap;

use serde::Serialize;

use crate::{
    attribute::AttributeName,
    state::{StateVarMutableViewEnum, StateVarValue},
    ComponentIdx,
};

use super::StateVarIdx;

pub type EssentialStateVar = StateVarMutableViewEnum;

/// Description of essential data
/// - component_idx: which component generated it
/// - origin: what aspect of the component generated it
#[derive(Debug, Clone)]
pub struct EssentialStateDescription {
    pub component_idx: ComponentIdx,
    pub origin: EssentialDataOrigin,
}

/// Essential data can be generated by
/// - a state variable requesting it
/// - a string child, converted into essential data
///   so that it can change when requested
/// - a string in an attribute
#[derive(Serialize, Debug, Clone, Eq, Hash, PartialEq)]
pub enum EssentialDataOrigin {
    /// Essential data was generated because a state variable requested it.
    StateVar(StateVarIdx),

    /// Essential data was generated by a string child.
    ///
    /// Unnamed *usize* field is the index of the string child
    StringChild(usize),

    /// Essential data was generated by a string in an attribute.
    ///
    /// Unnamed *usize* field is the index of the string child for that attribute
    AttributeChild(AttributeName, usize),
}

// TODO: presumably there are other variants given that we have an enum here
// If not, remove enum.
pub enum InitialEssentialData {
    Single {
        value: StateVarValue,
        came_from_default: bool,
    },
}

// TODO: do we still need this function?
// In cases where used it before, now get the value that exists as well.

// /// Returns whether or not we already have essential data stored
// /// for the given component_idx and origin.
// pub fn essential_data_exists_for(
//     component_idx: ComponentIdx,
//     origin: &EssentialDataOrigin,
//     essential_data: &Vec<HashMap<EssentialDataOrigin, EssentialStateVar>>,
// ) -> bool {
//     essential_data[component_idx].contains_key(origin)
// }

/// Create a piece of essential data that will be indexed by component_idx and origin
/// and it initialized to the value from initial_values
#[allow(clippy::ptr_arg)]
pub fn create_essential_data_for(
    component_idx: ComponentIdx,
    origin: EssentialDataOrigin,
    initial_values: InitialEssentialData,
    essential_data: &mut Vec<HashMap<EssentialDataOrigin, EssentialStateVar>>,
) -> &EssentialStateVar {
    let comp_essential_data = &mut essential_data[component_idx];

    assert!(!comp_essential_data.contains_key(&origin));

    // TODO: if we don't add additional variants, then remove the enum and this match.
    let essential_state = match initial_values {
        InitialEssentialData::Single {
            value,
            came_from_default,
        } => EssentialStateVar::new_with_value(value, came_from_default),
    };

    comp_essential_data.insert(origin.clone(), essential_state);

    // since we moved essential_state into the hash map, get a new reference to it here
    comp_essential_data.get(&origin).unwrap()
}
