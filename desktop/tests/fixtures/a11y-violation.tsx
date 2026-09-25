/** Deliberate jsx-a11y violation. The config test fails if the plugin is not loaded. */
export function BadClick(): JSX.Element {
  return <div onClick={() => undefined}>press</div>;
}
