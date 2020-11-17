// Copyright 2020 the Aleph.js authors. All rights reserved. MIT license.

#[macro_use]
extern crate lazy_static;

mod error;
mod fast_refresh;
mod import_map;
mod jsx;
mod resolve;
mod source_type;
mod swc;

use import_map::{ImportHashMap, ImportMap};
use resolve::Resolver;
use serde::{Deserialize, Serialize};
use std::rc::Rc;
use std::cell::RefCell;
use swc::EmitOptions;
use swc::ParsedModule;
use swc_ecmascript::parser::JscTarget;
use wasm_bindgen::prelude::{wasm_bindgen, JsValue};

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct Options {
    pub filename: String,

    #[serde(default)]
    pub import_map: ImportHashMap,

    #[serde(default)]
    pub swc_options: SWCOptions,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct SWCOptions {
    #[serde(default = "default_target")]
    pub target: JscTarget,

    #[serde(default = "default_pragma")]
    pub jsx_factory: String,

    #[serde(default = "default_pragma_frag")]
    pub jsx_fragment_factory: String,

    #[serde(default)]
    pub is_dev: bool,
}

impl Default for SWCOptions {
    fn default() -> Self {
        SWCOptions {
            target: default_target(),
            jsx_factory: default_pragma(),
            jsx_fragment_factory: default_pragma_frag(),
            is_dev: true,
        }
    }
}

fn default_target() -> JscTarget {
    JscTarget::Es2020
}

fn default_pragma() -> String {
    "React.createElement".into()
}

fn default_pragma_frag() -> String {
    "React.Fragment".into()
}

#[derive(Debug, Serialize)]
pub struct TransformOutput {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub map: Option<String>,
}

#[wasm_bindgen(js_name = "transformSync")]
pub fn transform_sync(s: &str, opts: JsValue) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();

    let opts: Options = opts
        .into_serde()
        .map_err(|err| format!("failed to parse options: {}", err))?;
    let module = ParsedModule::parse(opts.filename.as_str(), s, opts.swc_options.target)
        .expect("could not parse module");
    let resolver = Rc::new(RefCell::new(Resolver::new(
        opts.filename.as_str(),
        ImportMap::from_hashmap(opts.import_map),
        !opts.swc_options.is_dev,
        false, // todo: has_plugin_resolves
    )));
    let (code, map) = module
        .transpile(
            resolver,
            &EmitOptions {
                jsx_factory: opts.swc_options.jsx_factory.clone(),
                jsx_fragment_factory: opts.swc_options.jsx_fragment_factory.clone(),
                is_dev: opts.swc_options.is_dev,
            },
        )
        .expect("could not transpile module");

    Ok(JsValue::from_serde(&TransformOutput { code, map }).unwrap())
}
