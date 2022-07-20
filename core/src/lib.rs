
pub mod state_variables;
pub mod state_var;
pub mod parse_json;
pub mod text;
pub mod number;
pub mod text_input;
pub mod document;
pub mod boolean;

use std::collections::{HashMap, HashSet};
use std::fmt::Debug;

use state_variables::*;
use state_var::{StateVar, State, EssentialStateVar, StateVarValueType};

use crate::parse_json::Action;

use lazy_static::lazy_static;



#[derive(Debug)]
pub struct DoenetCore {
    pub components: HashMap<String, Box<dyn ComponentLike>>,
    pub dependencies: Vec<Dependency>,
    pub root_component_name: String,
}


/// This trait holds equivalent functions for every component, suitable for a derive macro.
/// To derive this, a struct must 
///     - have the fields: name, parent, child, and essential_state_vars
///     - have fields of type StateVar
pub trait ComponentLike: ComponentSpecificBehavior {

    fn name(&self) -> &str;

    fn children(&self) -> &Vec<ComponentChild>;

    fn parent(&self) -> &Option<String>;

    fn get_state_var(&self, name: StateVarName) -> Option<&StateVar>;

    fn get_essential_state_vars(&self) -> &HashMap<StateVarName, EssentialStateVar>;

    /// Return the name (lower case).
    fn get_component_type(&self) -> &'static str;
}


/// This trait holds functions that are defined differently for every component.
/// None of these functions should use the self parameter.
pub trait ComponentSpecificBehavior: Debug {

    /// This function should never use self in the body.
    fn state_variable_instructions(&self) -> &'static HashMap<StateVarName, StateVarVariant>;

    fn attribute_instructions(&self) -> &'static HashMap<&'static str, AttributeDefinition>;

    fn attributes(&self) -> &HashMap<AttributeName, Attribute>;

    fn get_copy_target_if_exists(&self) -> &Option<String>;


    // fn get_state_var_access(&self, name: StateVarName) -> Option<StateVarAccess>;

    // fn actions(&self) -> &phf::Map<&'static str, fn(HashMap<String, StateVarValue>) -> HashMap<StateVarName, StateVarUpdateInstruction<StateVarValue>>> {
    //     &phf_map! {}
    // }

    fn action_names(&self) -> Vec<&'static str>;


    fn on_action<'a>(
        &'a self, _action_name: &str, _args: HashMap<String, StateVarValue>,
        _resolve_and_retrieve_state_var: &'a dyn Fn(StateVarName) -> StateVarValue
    ) -> HashMap<StateVarName, StateVarValue>
    {

        HashMap::new()
    }

    /// This function should never use self in the body.
    fn should_render_children(&self) -> bool;
    
    /// This function should never use self in the body.
    fn get_trait_names(&self) -> Vec<ObjectTraitName>;

}


lazy_static! {

    pub static ref COMPONENT_TYPES: HashSet<ComponentType> = HashSet::from([
        "text",
        "number",
        "textInput",
        "document",
        "boolean",
    ]);
    
}

pub fn create_new_component_of_type(component_type: ComponentType, name: &str, parent_name: Option<&str>, children: Vec<ComponentChild>, attributes: HashMap<AttributeName, Attribute>, copy_target: Option<String>) -> Result<Box<dyn ComponentLike>, String> {

    // Before we create the component, we have to figure out which of its 
    // state vars are essential state vars. Note that we're technically doing more
    // work than we have to because we're doing all the work for each component,
    // rather than each component type

    let state_var_definitions: &HashMap<StateVarName, StateVarVariant> = match component_type {
        "text" =>       &crate::text::MY_STATE_VAR_DEFINITIONS,
        "number" =>     &crate::number::MY_STATE_VAR_DEFINITIONS,
        "textInput" =>  &crate::text_input::MY_STATE_VAR_DEFINITIONS,
        "document" =>   &crate::document::MY_STATE_VAR_DEFINITIONS,
        "boolean" =>    &crate::boolean::MY_STATE_VAR_DEFINITIONS,

        _ => {
            return Err(format!("Unrecognized component type {}", component_type));
        }
    };

    let mut essential_state_vars = HashMap::new();
    for (&state_var_name, state_var_def) in state_var_definitions {
        
        if state_var_def.has_essential() {
            essential_state_vars.insert(state_var_name, EssentialStateVar::derive_from(
                
                // TODO: This is hacky. We should create the actual StateVars first
                match state_var_def {
                    StateVarVariant::String(_) => StateVar::new(StateVarValueType::String),
                    StateVarVariant::Integer(_) => StateVar::new(StateVarValueType::Integer),
                    StateVarVariant::Number(_) => StateVar::new(StateVarValueType::Number),
                    StateVarVariant::Boolean(_) => StateVar::new(StateVarValueType::Boolean),
                }
            ));
        }
    }


    let name = name.to_string();
    let parent_name = if let Some(par_name) = parent_name {
        Some(par_name.to_string())
    } else {
        None
    };

    match component_type {

        "text" => Ok(text::Text::create(
            name,
            parent_name,
            children,
            essential_state_vars,
            attributes,
            copy_target,
        )),
        "number" => Ok(number::Number::create(
            name,
            parent_name,
            children,
            essential_state_vars,
            attributes,
            copy_target,
        )),
        "textInput" => Ok(text_input::TextInput::create(
            name,
            parent_name,
            children,
            essential_state_vars,
            attributes,
            copy_target,
        )),
        "document" => Ok(document::Document::create(
            name,
            parent_name,
            children,
            essential_state_vars,
            attributes,
            copy_target,
        )),
        "boolean" => Ok(boolean::Boolean::create(
            name,
            parent_name,
            children,
            essential_state_vars,
            attributes,
            copy_target,
        )),

        // Add components to this match here

        _ => {
            return Err(format!("Unrecognized component type {}", component_type));
        }
    }
}


fn set_state_var(
    component: &dyn ComponentLike,
    name: StateVarName,
    val: StateVarValue)
-> Result<(), String>    
{
    let state_var = component.get_state_var(name).expect(
        &format!("Component {} of type {} does not have state var {}",
        component.name(), component.get_component_type(), name)
    );

    state_var.set_value(val)
        
}





trait TextLikeComponent: ComponentLike {
    fn text_value(&self) -> String;
}
trait NumberLikeComponent: ComponentLike {
    fn add_one(&self) -> f64;
}


#[derive(Clone, PartialEq, Debug)]
pub enum ObjectTraitName {
    TextLike,
    NumberLike,
    ComponentLike,
}


#[derive(Debug)]
pub enum ComponentChild {
    String(String),
    Component(String),
}


pub fn create_doenet_core(json_deserialized: serde_json::Value) -> DoenetCore {

    // log!("Received json {:#?}", json_deserialized);

    let possible_components_tree = parse_json::create_components_tree_from_json(&json_deserialized)
        .expect("Error parsing json for components");

    let (components, root_component_name) = possible_components_tree;




    let mut dependencies: Vec<Dependency> = vec![];
    
    for (_, component) in components.iter() {

        let mut dependencies_for_this_component = create_all_dependencies_for_component(&components, component.as_ref());
        dependencies.append(&mut dependencies_for_this_component);
        
    }

    log!("components {:#?}", components);


    // Return the DoenetCore structure
    DoenetCore {
        components,
        dependencies,
        root_component_name
    }
}





pub fn create_all_dependencies_for_component(
    components: &HashMap<String, Box<dyn ComponentLike>>,
    component: &dyn ComponentLike,
) -> Vec<Dependency>

{

    log!("Creating depencies for {:?}", component.name());
    let mut dependencies: Vec<Dependency> = vec![];

    let my_definitions = component.state_variable_instructions();

    for (&state_var_name, state_var_def) in my_definitions {

        // Eventually, call state_vars_to_determine_dependencies() and go calculate those values
        let dependency_instructions_hashmap = state_var_def.return_dependency_instructions(HashMap::new());

        for (dep_name, dep_instruction) in dependency_instructions_hashmap.into_iter() {

            let dependency =  create_dependency_from_instruction(&components, component, state_var_name, dep_instruction, dep_name);

            dependencies.push(dependency);

        }

    }

    dependencies

}


fn create_dependency_from_instruction(
    components: &HashMap<String, Box<dyn ComponentLike>>,
    component: &dyn ComponentLike,
    state_var_name: StateVarName,
    instruction: DependencyInstruction,
    instruction_name: InstructionName,

) -> Dependency {

    let depends_on_objects: Vec<ObjectName>;
    let depends_on_state_vars: Vec<StateVarName>;

    log!("Creating dependency {}:{}:{}", component.name(), state_var_name, instruction_name);


    match &instruction {

        DependencyInstruction::StateVar(state_var_instruction) => {

            depends_on_objects = if let Option::Some(ref name) = state_var_instruction.component_name {
                    vec![ObjectName::Component(name.to_string())]
                } else {
                    vec![ObjectName::Component(component.name().clone().to_owned())]
                };
            depends_on_state_vars = vec![state_var_instruction.state_var];
        },

        DependencyInstruction::Child(child_instruction) => {
            let all_children = component.children();

            let mut depends_on_children: Vec<ObjectName> = vec![];
            for child in all_children.iter() {

                for desired_child_type in child_instruction.desired_children.iter() {
                    match child {
                        ComponentChild::Component(child_component_name) => {
                            let child_component = components.get(child_component_name).unwrap();

                            if child_component.get_trait_names().contains(desired_child_type) {
                                // If not already in list, add it to the list
                                if !depends_on_children.contains(&ObjectName::Component(child_component.name().to_owned())) {
                                    depends_on_children.push(ObjectName::Component(child_component.name().to_owned()));
                                }
                            }
                        },

                        ComponentChild::String(string_value) => {
                            if desired_child_type == &ObjectTraitName::TextLike ||
                                desired_child_type == &ObjectTraitName::NumberLike {
                                
                                depends_on_children.push(ObjectName::String(string_value.to_owned()));

                            }
                        },
                    }

                }
            }

            depends_on_objects = depends_on_children;
            depends_on_state_vars = child_instruction.desired_state_vars.clone();

        },
        DependencyInstruction::Parent(parent_instruction) => {
            // Parent doesn't exist yet

            let parent_name = component.parent().clone().expect(&format!(
                "Component {} doesn't have a parent, but the dependency instruction {}:{} asks for one.",component.name(), state_var_name, instruction_name
            ));

            depends_on_objects = vec![ObjectName::Component(parent_name)];
            depends_on_state_vars = vec![parent_instruction.state_var];
        },


        DependencyInstruction::Attribute(attribute_instruction) => {

            log!("attribute instruction {:#?}", attribute_instruction);
            log!("component attributes {:#?}", component.attributes());

            if let Some(attribute) = component.attributes().get(attribute_instruction.attribute_name) {
                match attribute {
                    Attribute::Component(attr_comp_name) => {
                        depends_on_objects = vec![ObjectName::Component(attr_comp_name.to_string())];

                        // hard code this for now
                        depends_on_state_vars = vec!["value"];
                    },

                    Attribute::Primitive(attr_primitive_value) => {
                        depends_on_objects = vec![ObjectName::String(

                            // for now, convert it to a string
                            match attr_primitive_value {
                                StateVarValue::String(v) => v.to_string(),
                                StateVarValue::Boolean(v) => v.to_string(),
                                StateVarValue::Number(v) => v.to_string(),
                                StateVarValue::Integer(v) => v.to_string(),
                            }
                        )];

                        depends_on_state_vars = vec![];
                    }
                }

            } else {
                // Attribute doesn't exist
                depends_on_objects = vec![];
                depends_on_state_vars = vec![];
            }

        }
    };


    Dependency {
        name: instruction_name,
        component: component.name().clone().to_owned(),
        state_var: state_var_name,
        variables_optional: false,

        depends_on_objects,
        depends_on_state_vars,
    }


}





pub fn dependencies_for_component<'a>(
    core: &'a DoenetCore,
    component_name: &str,
    state_var_name: StateVarName) -> Vec<&'a Dependency>
{
    core.dependencies.iter().filter(
        |dep| dep.component == component_name && dep.state_var == state_var_name
    ).collect()
}








/// Ensure a state variable is not stale and can be safely unwrapped.
pub fn resolve_state_variable(core: &DoenetCore, component: &dyn ComponentLike, state_var_name: StateVarName) {

    // debug_assert!() that none of this state_variable's dep instructions are blocked

    // log!("Resolving state variable {}:{}", component.name(), state_var_name);

    let mut dependency_values: HashMap<InstructionName, Vec<DependencyValue>> = HashMap::new();

    let my_dependencies = dependencies_for_component(core, component.name(), state_var_name);


    for dep in my_dependencies {

        let mut values_for_this_dep: Vec<DependencyValue> = Vec::new();

        for depends_on in &dep.depends_on_objects {

            match depends_on {
                ObjectName::String(string) => {

                    // Right now, the only thing you can get from a string is its faked 'value' state var
                    if dep.depends_on_state_vars.contains(&"value") {
                        values_for_this_dep.push(DependencyValue {
                            component_type: "string",
                            state_var_name: "value",
                            value: StateVarValue::String(string.to_string()),
                        });
               
                    }
                },
                ObjectName::Component(component_name) => {

                    let depends_on_component = core.components.get(component_name).unwrap().as_ref();
                    for &dep_state_var_name in &dep.depends_on_state_vars {

                        // log!("About to recurse and resolve {}:{}", depends_on_component.name(), dep_state_var_name);

                        resolve_state_variable(core, depends_on_component, dep_state_var_name);
                        let state_var = depends_on_component.get_state_var(dep_state_var_name).unwrap();
                        let state_var_value = state_var.get_state();


                        if let State::Resolved(state_var_value) = state_var_value {
                            values_for_this_dep.push(DependencyValue {
                                component_type: core.components.get(component_name).unwrap().get_component_type(),
                                state_var_name: dep_state_var_name,
                                value: state_var_value,
                            });
    
                        } else {
                            panic!("Tried to access stale state var {}:{} (component type {})", depends_on_component.name(), dep_state_var_name, depends_on_component.get_component_type());
                        }

                    }
                }
            }
        }

        // log!("dep name {}", dep.name);
        dependency_values.insert(dep.name, values_for_this_dep);
    }

    let definition = component.state_variable_instructions().get(state_var_name).unwrap();

    let update_instruction = definition.determine_state_var_from_dependencies(dependency_values);
    
    handle_update_instruction(component, state_var_name, update_instruction);

    // log!("{}:{} resolved", component.name(), state_var_name);
    // log!("{:?}", component);
    
}



pub fn mark_stale_state_var_and_dependencies(
    core: &DoenetCore,
    component: &dyn ComponentLike,
    state_var_name: StateVarName)
{

    // log!("Marking stale {}:{}", component.name(), state_var_name);

    let state_var = component.get_state_var(state_var_name).unwrap();
    state_var.mark_stale();

    let my_dependencies = dependencies_for_component(core, component.name(), state_var_name);
    for dependency in my_dependencies {

        for depends_on in &dependency.depends_on_objects {
            match depends_on {
                ObjectName::String(_) => {
                    // do nothing
                },
                ObjectName::Component(dep_comp_name) => {
                    let dep_component = core.components.get(dep_comp_name).unwrap().as_ref();

                    for &dep_state_var_name in &dependency.depends_on_state_vars {

                        mark_stale_state_var_and_dependencies(core, dep_component, dep_state_var_name);
                    }
                }
            }
        }
    }

}

pub fn handle_update_instruction(
    component: &dyn ComponentLike,
    name: StateVarName,
    instruction: StateVarUpdateInstruction<StateVarValue>)
{
    let definition = component.state_variable_instructions().get(name).unwrap();
    match instruction {
        StateVarUpdateInstruction::NoChange => {
            let current_value = component.get_state_var(name).unwrap().get_state();

            if let State::Resolved(_) = current_value {
                // Do nothing. It's resolved, so we can use it as is
            } else {
                panic!("Cannot use NoChange update instruction on a stale value");
            }

        },
        StateVarUpdateInstruction::UseEssentialOrDefault => {
            if definition.has_essential() == false {
                panic!(
                    "Cannot UseEssentialOrDefault on {}:{},
                    which has no essential (Component type {}) ",
                    component.name(), name, component.get_component_type()
                );
            }

            let possible_essential_val = component.get_essential_state_vars().get(name).unwrap().get_value();
            let new_state_var_value = if let Some(actual_val) = possible_essential_val {
                actual_val
            } else {
                definition.default_value()
            };
            

            set_state_var(component, name, new_state_var_value).expect(
                &format!("Failed to set {}:{}", component.name(), name)
            );

        },
        StateVarUpdateInstruction::SetValue(new_value) => {

            let new_state_var_value = new_value;
            set_state_var(component, name, new_state_var_value).expect(
                &format!("Failed to set {}:{}", component.name(), name)
            );
        }

    };
}




pub fn handle_action_from_json(core: &DoenetCore, action_obj: serde_json::Value) {
    
    let action = parse_json::parse_action_from_json(action_obj)
        .expect("Error parsing json action");

    handle_action(core, action);
}


// This should be private eventually
pub fn handle_action<'a>(core: &'a DoenetCore, action: Action) {

    // log!("Handling action {:#?}", action);
    let component = core.components.get(&action.component_name)
        .expect(&format!("Can't handle action on {} which doesn't exist", action.component_name)).as_ref();

    let state_var_resolver = | state_var_name | {
        resolve_state_variable(core, component, state_var_name);
        component.get_state_var(state_var_name).unwrap().copy_value_if_resolved().unwrap()
    };

    let state_vars_to_update = component.on_action(&action.action_name, action.args, &state_var_resolver);

    for (name, requested_value) in state_vars_to_update {

        let definition = component.state_variable_instructions().get(name).unwrap();
        let requests = definition.request_dependencies_to_update_value(requested_value);

        for request in requests {
            process_update_request(core, component, name, request);

        }
    }

}


pub fn process_update_request(
    core: &DoenetCore,
    component: &dyn ComponentLike,
    state_var_name: StateVarName,
    update_request: UpdateRequest) 
{

    // log!("Processing update request for {}:{}", component.name(), state_var_name);

    match update_request {
        UpdateRequest::SetEssentialValue(their_name, requested_value) => {

            let essential_var = component.get_essential_state_vars().get(their_name).unwrap();
            essential_var.set_value(requested_value).expect(
                &format!("Failed to set essential value for {}:{}", component.name(), their_name)
            );
        },

        UpdateRequest::SetStateVarDependingOnMe(their_name, requested_value) => {

            log!("desired value {:?}", requested_value);


            let state_var_definition = component.state_variable_instructions().get(their_name).unwrap();

            let their_update_requests = state_var_definition.request_dependencies_to_update_value(requested_value);

            for their_update_request in their_update_requests {
                process_update_request(core, component, their_name, their_update_request);
            }

        }
    }

    mark_stale_state_var_and_dependencies(core, component, state_var_name);


}







pub fn update_renderers(core: &DoenetCore) -> serde_json::Value {
    let json_obj = generate_render_tree(core);
    json_obj
}


pub fn generate_render_tree(core: &DoenetCore) -> serde_json::Value {

    let root_node = core.components.get(&core.root_component_name).unwrap().as_ref();
    let mut json_obj: Vec<serde_json::Value> = vec![];

    generate_render_tree_internal(core, root_node, &mut json_obj);

    serde_json::json!(json_obj)
}


fn generate_render_tree_internal(core: &DoenetCore, component: &dyn ComponentLike, json_obj: &mut Vec<serde_json::Value>) {

    use serde_json::Value;
    use serde_json::json;

    let state_vars = component.state_variable_instructions();

    let renderered_state_vars = state_vars.into_iter().filter(|kv| match kv.1 {
        StateVarVariant::Integer(sv) => sv.for_renderer,
        StateVarVariant::Number(sv) => sv.for_renderer,
        StateVarVariant::String(sv) => sv.for_renderer,
        StateVarVariant::Boolean(sv) => sv.for_renderer,
    });

    let mut state_values = serde_json::Map::new();
    for (name, _variant) in renderered_state_vars {

        resolve_state_variable(core, component, name);

        let state_var_value = component.get_state_var(name).unwrap().copy_value_if_resolved();

        let state_var_value = state_var_value.unwrap();

        // log!("components right now {:#?}", core.components);
        // log!("{:#?}", state_var_value);

        state_values.insert(name.to_string(), match state_var_value {
            StateVarValue::Integer(v) => json!(v),
            StateVarValue::Number(v) =>  json!(v),
            StateVarValue::String(v) =>  json!(v),
            StateVarValue::Boolean(v) =>    json!(v),
        });

    }


    let children_instructions = if component.should_render_children() {
        let children = component.children();
        children.iter().map(|child| match child {
            ComponentChild::Component(comp_name) => {
                // recurse for children
                let comp = core.components.get(comp_name).unwrap().as_ref();

                generate_render_tree_internal(core, comp, json_obj);

                let mut child_actions = serde_json::Map::new();
                for action_name in comp.action_names() {
                    child_actions.insert(action_name.to_string(), json!({
                        "actionName": action_name,
                        "componentName": comp.name(),
                    }));
                }

                json!({
                    "actions": child_actions,
                    "componentName": comp.name().to_string(),
                    "componentType": comp.get_component_type().to_string(),
                    "effectiveName": comp.name().to_string(),
                    "rendererType": comp.get_component_type().to_string(),
                })},
            ComponentChild::String(string) => {
                json!(string)
            },
        }).collect()
    } else {
        vec![]
    };

    json_obj.push(json!({
        "componentName": component.name(),
        "stateValues": Value::Object(state_values),
        "childrenInstructions": json!(children_instructions),
    }));

}




pub fn package_subtree_as_json(
    components: &HashMap<String, Box<dyn ComponentLike>>,
    component: &dyn ComponentLike) -> serde_json::Value {

    use serde_json::Value;
    use serde_json::Map;
    use serde_json::json;

    // Children

    let mut children: Map<String, Value> = Map::new();

    for (child_num, child) in component.children().iter().enumerate() {

        let label;
        let child_json;
        match child {
            ComponentChild::Component(comp_child_name) => {
                let comp_child = components.get(comp_child_name).unwrap().as_ref();
                child_json = package_subtree_as_json(components, comp_child);
                label = format!("{} {}", child_num, comp_child_name);
            }
            ComponentChild::String(str) => {
                child_json = Value::String(str.to_string());
                label = format!("{}", child_num);
            }
        };


        children.insert(label, child_json);
    }


    // Attributes

    let mut attributes: Map<String, Value> = Map::new();

    for (attribute_name, attribute) in component.attributes() {

        let attribute_json = match attribute {
            Attribute::Component(component_name) => {
                Value::String(component_name.to_string())
            },
            Attribute::Primitive(state_var_value) => {
                match state_var_value {
                    StateVarValue::String(v) => json!(v),
                    StateVarValue::Number(v) => json!(v),
                    StateVarValue::Integer(v) => json!(v),
                    StateVarValue::Boolean(v) => json!(v),
                }
            }
        };

        attributes.insert(attribute_name.to_string(), attribute_json);
    }



    
    let mut my_json_props: serde_json::Map<String, Value> = serde_json::Map::new();

    my_json_props.insert("children".to_string(), json!(children));
    my_json_props.insert("attributes".to_string(), json!(attributes));
    my_json_props.insert("parent".to_string(),
        match component.parent() {
            None => Value::Null,
            Some(parent_name) => Value::String(parent_name.into()),
    });
    my_json_props.insert("type".to_string(), Value::String(component.get_component_type().to_string()));


    for &state_var_name in component.state_variable_instructions().keys() {
        let state_var = component.get_state_var(state_var_name).unwrap();

        my_json_props.insert(

            format!("sv: {}", state_var_name),

            match state_var.get_state() {
                State::Resolved(value) => match value {
                    StateVarValue::String(v) => json!(v),
                    StateVarValue::Number(v) => json!(v),
                    StateVarValue::Integer(v) => json!(v),
                    StateVarValue::Boolean(v) => json!(v),
                },
                State::Stale => Value::Null,
            }
        );

    }

    for (esv_name, essential_state_var) in component.get_essential_state_vars() {

        my_json_props.insert(

            format!("essen: {}", esv_name),

            match essential_state_var.get_value() {
                Some(value) => match value {
                    StateVarValue::String(v) => json!(v),
                    StateVarValue::Number(v) => json!(v),
                    StateVarValue::Integer(v) => json!(v),
                    StateVarValue::Boolean(v) => json!(v),
                },
                None => Value::Null,
            }
        );

    }

    Value::Object(my_json_props)

}



impl DoenetCore {
    pub fn json_components(&self) -> serde_json::Value {

        let mut json_components = serde_json::Map::new();
    
        for component in self.components.values() {
            json_components.insert(
                component.name().to_string(),
                package_subtree_as_json(&self.components, component.as_ref())
            );
        }
    
    
        serde_json::Value::Object(json_components)
    }
}
