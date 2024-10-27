import { truncate } from "../src/utils";



describe('truncate function', () => {
  test('should return the entire array if all values are above minValue', () => {
    const input = [5, 6, 7, 8, 9];
    const result = truncate(input, 4, 3);
    expect(result).toEqual(input);
  });

  test('should return at least minLength elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = truncate(input, 10, 3);
    expect(result).toEqual([3, 4, 5]);
  });

  test('should keep elements above or equal to minValue', () => {
    const input = [1, 2, 3, 4, 5];
    const result = truncate(input, 3, 2);
    expect(result).toEqual([3, 4, 5]);
  });

  test('should work with an empty array', () => {
    const input: number[] = [];
    const result = truncate(input, 5, 3);
    expect(result).toEqual([]);
  });

  test('should return entire array if minLength is greater than array length', () => {
    const input = [1, 2, 3];
    const result = truncate(input, 5, 5);
    expect(result).toEqual(input);
  });
});