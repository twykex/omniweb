import { robustJsonParse } from './helpers';

describe('Robust JSON Parser', () => {
    test('should correctly parse JSON with literal backslash at end of string', () => {
        // JSON: [{"val": "end\\"}]
        // In JS string: '[{"val": "end\\\\"}]'
        const validJson = '[{"val": "end\\\\"}]';
        const input = validJson + " extra text";

        const result = robustJsonParse(input, 'array');
        expect(result).toEqual([{val: "end\\"}]);
    });

    test('should correctly parse JSON with nested objects and arrays', () => {
        const input = 'Prefix text {"a": [1, 2, {"b": "foo"}]} Suffix text';
        const result = robustJsonParse(input, 'object');
        expect(result).toEqual({a: [1, 2, {b: "foo"}]});
    });

    test('should fail if type mismatch', () => {
        const input = '{"a": 1}';
        const result = robustJsonParse(input, 'array');
        // It tries to find '['. None found. Returns null.
        expect(result).toBeNull();
    });

    test('should handle escaped quotes', () => {
        // JSON: {"msg": "Say \"hello\""}
        const input = '{"msg": "Say \\"hello\\""}';
        const result = robustJsonParse(input);
        expect(result).toEqual({msg: 'Say "hello"'});
    });

    test('should handle multiple backslashes', () => {
        // JSON: {"path": "C:\\Windows\\System32"}
        // JS String: '{"path": "C:\\\\Windows\\\\System32"}'
        const input = '{"path": "C:\\\\Windows\\\\System32"}';
        const result = robustJsonParse(input);
        expect(result).toEqual({path: 'C:\\Windows\\System32'});
    });
});
