interface Target {
  input: { [key in string]: TargetValueType };
  output: { [key in string]: TargetValueType };
}

type MapTypes = {
  int32: number;
  string: string;
};

type Define<E, T extends E> = T;
type Config = Define<
  Target,
  {
    input: {
      value: 'int32';
      optional: 'string?';
    };
    output: {
      value: 'int32';
    };
  }
>;

interface TargetItem {
  type: ValueOf<MapTypes>;
  isRequired: boolean;
}

type TargetValueType = `${keyof MapTypes}${'' | '?'}`;

type TransformTargetType<T extends TargetValueType> = Define<
  TargetItem,
  T extends `${infer Type}?`
    ? { isRequired: false; type: MapTypes[Extract<Type, keyof MapTypes>] }
    : { isRequired: true; type: MapTypes[Extract<T, keyof MapTypes>] }
>;

type Foo = { x: string }; // { x: { x?: string }; y: { y?: string } }

//  { x?: string } | { y?: string }
//  { x?: string } & { y?: string }
//  { x?: string; y?: string }

type TransformTarget<T extends { [key in string]: TargetValueType }> =
  ReMapObject<{
    [key in keyof T]: [TransformTargetType<T[key]>] extends [
      infer Metadata extends TargetItem
    ]
      ? Metadata['isRequired'] extends true
        ? { [$key in key]: Metadata['type'] }
        : { [$key in key]?: Metadata['type'] }
      : never;
  }>;
type TransformTargetComputed<T extends Target> = {
  [key in keyof T]: TransformTarget<T[key]>;
};

function tranformTarget(
  input: TransformTargetComputed<Config> & {
    [key in keyof Config]: { [$key in keyof Config[key]]?: unknown };
  }
) {
  return input;
}

tranformTarget({
  input: {
    value: 332,
    optional: undefined,
  },
  output: {
    value: 2432,
  },
});

const source = {
  foo: '',
  bar: '33',
};

type Output = {};

type ReMapObject<T> = Compute<UnionToIntersection<NonNullable<ValueOf<T>>>>;

type UnionToIntersection<U> = (
  U extends any ? (value: U) => void : never
) extends (value: infer V) => void
  ? V
  : never;

type ValueOf<T> = T extends unknown[] ? T[number] : T[keyof T];

type Compute<T> = { [key in keyof T]: T[key] } & {};
