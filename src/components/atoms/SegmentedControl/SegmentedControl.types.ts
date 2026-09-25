export type SegmentedOption<TValue extends string | number> = {
  value: TValue
  label: string
}

export type SegmentedControlProps<TValue extends string | number> = {
  accessibilityLabel: string
  options: ReadonlyArray<SegmentedOption<TValue>>
  value: TValue
  onChange: (value: TValue) => void
}
