import {CSSResultGroup, unsafeCSS} from 'lit';

function color(red: number, green: number, blue: number, alpha: number): CSSResultGroup {
  return unsafeCSS(`rgba(${red}, ${green}, ${blue}, ${alpha})`);
}

export class Spacing {
  public static readonly Border = 1;
  public static readonly BorderRadius = unsafeCSS('6px');
  public static readonly MobileBreakpoint = unsafeCSS('600px');
  public static readonly Gap = unsafeCSS('1rem');
  public static readonly SmallGap = unsafeCSS('0.5rem');
  public static readonly VerySmallGap = unsafeCSS('0.1rem');
  public static readonly InputHeight = unsafeCSS('2.5rem');
}

export function border(color: CSSResultGroup): CSSResultGroup {
  return unsafeCSS(`1px solid ${color}`);
}

export class Colors {
  public static readonly Default = {
    Text: color(0, 0, 0, 1),
    TransparentText: color(0, 0, 0, 0.6),
    Border: color(0, 0, 0, 1),
    BorderLight: color(0, 0, 0, 0.5),
    Background: color(256, 256, 256, 1),
  };
  public static readonly Primary = {
    Background: color(0, 0, 256, 1),
    Text: color(256, 256, 256, 1),
    Transparent: color(0, 0, 256, 0.1),
    Border: color(0, 0, 0, 0.175),
    Hover: color(100, 100, 256, 1),
    Light: color(200, 200, 256, 1),
  };
  public static readonly Secondary = {
    Background: color(256, 256, 256, 1),
    Text: color(0, 0, 256, 1),
    Hover: color(220, 220, 256, 1),
    Border: color(0, 0, 256, 1),
  };
  public static readonly Danger = {
    Background: color(220, 0, 0, 1),
    Text: color(256, 256, 256, 1),
    Hover: color(256, 0, 0, 1),
    Border: color(0, 0, 0, 0.175),
    Transparent: color(150, 0, 0, 0.1),
    Light: color(200, 100, 100, 1),
  };
  public static readonly Success = {
    Background: color(50, 200, 50, 1),
    Text: color(256, 256, 256, 1),
    Border: color(0, 0, 0, 0.175),
  };
  public static readonly Disabled = {
    Background: color(100, 100, 100, 1),
    Text: color(256, 256, 256, 1),
    Transparent: color(100, 100, 100, 0.1),
    Border: color(0, 0, 0, 0.175),
  };
}
