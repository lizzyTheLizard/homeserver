# Spec Delta

## REMOVED Requirements

### Requirement: CoEditor pages use the new design language

**Reason**: The capability is retired; its behavior moves into the new repo-mirroring capability tree. The design language is a web-wide behavior, so it is generalized into the new `web` capability rather than kept per page.

**Migration**: See the "The web application uses a shared design language" requirement in the `web` capability spec.

### Requirement: CoEditor pages are visually consistent with the rest of the application

**Reason**: Retired with the capability; visual consistency with the rest of the application is a web-wide behavior.

**Migration**: See the `web` capability spec, which owns the shared design language and shared components.

### Requirement: CoEditor restyle preserves existing functionality

**Reason**: Retired with the capability; the preserved CoEditor behavior moves to the new `web/coeditor` capability.

**Migration**: See the `web/coeditor` capability spec.

### Requirement: Editor offers proposed actions and a chat command input

**Reason**: Retired with the capability; the editor-specific behavior moves to the new `web/coeditor/editor` capability.

**Migration**: See the `web/coeditor/editor` capability spec.
