export abstract class Context<Input extends object = object> {
  constructor(public readonly input: Input) {}
}
