# web/coeditor/settings Specification

## Purpose

Defines the CoEditor settings page: managing the per-language profiles and the context templates that the editor uses to ground its commands.

## Requirements

### Requirement: Settings manages profiles per language

The settings page SHALL let the user create, edit and delete profiles, where a profile pairs a language with a text, and SHALL keep at most one profile per language for a user.

#### Scenario: Creating and editing a profile
- **WHEN** the user saves a profile with a language, a non-blank text and no other profile of that language
- **THEN** the profile is stored and appears in the profile list

#### Scenario: A second profile for a language is rejected
- **WHEN** the user saves a profile whose language is already used by another of the user's profiles
- **THEN** the save fails with an error naming the language

#### Scenario: Deleting a profile
- **WHEN** the user confirms deleting a profile
- **THEN** the profile no longer appears in the profile list

### Requirement: Settings manages context templates

The settings page SHALL let the user create, edit and delete context templates, where a template has a name, a language and a text, and SHALL show each template's name, language and text in the list.

#### Scenario: Creating and editing a template
- **WHEN** the user saves a template with a non-blank name and language
- **THEN** the template is stored and appears in the template list

#### Scenario: Deleting a template also removes its discussions
- **WHEN** the user confirms deleting a template that has discussions
- **THEN** the template and its discussions are gone

#### Scenario: Deletion warns about the discussions
- **WHEN** the user activates delete for a template
- **THEN** the confirmation says that the template's discussions are deleted too

### Requirement: Template parameters are declared in the template text

The settings page SHALL derive a template's parameters from the placeholders in its text, written `{name:TYPE}` or `{name:TYPE:value1,value2}`, where the type is one of `STRING`, `SELECT` or `TEXT` (written in any case). It SHALL reject a placeholder whose name is empty, whose syntax is not of that form, or whose type is not one of the supported types.

#### Scenario: Placeholders become parameters
- **WHEN** a template's text declares a placeholder with a name and a supported type
- **THEN** the saved template exposes that parameter to the editor, typed according to the placeholder

#### Scenario: Several values declare a select parameter
- **WHEN** a placeholder lists values after its type
- **THEN** the parameter is offered as a selection of those values

#### Scenario: Malformed placeholder is rejected
- **WHEN** a template's text contains a placeholder whose name is empty or whose syntax does not follow the declared form
- **THEN** the save fails with an error describing the expected syntax

#### Scenario: Unsupported parameter type is rejected
- **WHEN** a placeholder names a type other than the supported ones
- **THEN** the save fails with an error listing the allowed types

### Requirement: A user without templates gets two defaults

When a user has no templates, CoEditor SHALL create and store the default templates "No Context" and "With Context" so the editor is usable without any setup, and SHALL recreate them if the user deletes every template.

#### Scenario: Defaults appear for a new user
- **WHEN** a user with no templates opens the editor or the settings page
- **THEN** the templates "No Context" and "With Context" are created and available

#### Scenario: Defaults return after deleting every template
- **WHEN** the user deletes their last template and reopens the editor or the settings page
- **THEN** the two default templates are created again

### Requirement: Editing happens in a sidebar with confirmed deletion

Creating and editing a profile or a template SHALL happen in a sidebar that saves the entry, shows a pending state while saving, reports a failed save in the sidebar, and requires a confirmation step before deleting.

#### Scenario: Failed save is reported
- **WHEN** saving a profile or template fails
- **THEN** the sidebar stays open and shows the error

#### Scenario: Deletion requires confirmation
- **WHEN** the user activates delete for a profile or template
- **THEN** a confirmation is shown and nothing is deleted until the user confirms
