declare var describe, it, expect, hot, cold, expectObservable, expectSubscriptions, rxTestScheduler, beforeEach;
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/concat';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/merge';
import 'rxjs/add/operator/retry';
import 'rxjs/add/operator/take';

/*
    RxJS marble testing allows for a more natural style of testing observables.
    To get started, you need to include a few helpers libraries, marble-testing.ts and test-helper.ts,
    in your karma.conf or wallaby.js configuration file. 
    These files provide helpers for parsing marble diagrams and asserting against the subscription points and result
    of your observables under test. For these examples I will be using Jasmine, but Mocha and Chai works just as well.

    Let's get started with the basics of marble testing!

    First, let's understand the pieces that make up a valid marble diagram.

    Dash: Indicates a passing of time, you can think of each dash as 10ms when it comes to your tests.
    -----                 <----- 50ms
    Characters: Each character inside the dash indicates an emission.
    -----a-----b-----c    <----- Emit 'a' at 60ms, 'b' at 120ms, 'c' at 180ms
    Pipes |: Pipes indicate the completion point of an observable.
    -----a|               <----- Emit 'a' at 60ms then complete (70ms)
    Parenthesis (): Parenthesis indicate multiple emissions in same time frame, think Observable.of(1,2,3)
    -----(abc|)           <----- Emit 'a''b''c' at 60ms then complete (60ms)
    Caret ^: Indicates the starting point of a subscription, used with expectSubscription assertion.
    ^-------              <----- Subscription point at caret.
    Exclamation Point - !: Indicates the end point of a subscription, also used with expectSubscription assertion.
    ^------!              <----- Subscription starts at caret, ends at exclamation point.
    Pound Sign - #: Indicates an error
    ---a---#              <----- Emit 'a' at 40ms, error at 80ms
    There are also a few methods included to parse marble sequences and transpose values.

    cold(marbles: string, values?: object, error?: any) : Subscription starts when test begins
    cold(--a--b--|, {a: 'Hello', b: 'World'})           <----- Emit 'Hello' at 30ms and 'World' at 60ms, complete at 90ms
    hot(marbles: string, values?: object, error?: any) : Behaves like subscription starts at point of caret
    hot(--^--a---b--|, {a: 'Goodbye', b: 'World'})      <----- Subscription begins at point of caret
*/

describe('Marble testing', () => {
    /*
        Marble diagrams are parsed, creating an observable that emits test message objects.
        These include the values emitted, the frame at which they were emitted, and the type 
        of notification, including next, error, and complete. This allows a deep equal to be run
        against the expected output, which is created in the same fashion by parsing the marble diagram
        supplied in the toBe clause.

        Example output: 
        {"frame":30,"notification":{"kind":"N","value":"a","hasValue":true}}
​        {"frame":70,"notification":{"kind":"N","value":"b","hasValue":true}}
​        {"frame":110,"notification":{"kind":"C","hasValue":false}}
    */
    it('should parse marble diagrams', () => {
        const source = cold(  '---a---b---|');
        const expected =      '---a---b---|';

        expectObservable(source).toBe(expected);
    });
    /*
        When using cold observables you do not need to indicate a subscription point.
        The point of subscription is treated as the beginning of the test.
    */
    it('should work with cold observables', () => {
        const obs1 = cold('-a---b-|');
        const obs2 = cold('-c---d-|')
        const expected =  '-a---b--c---d-|';

        expectObservable(obs1.concat(obs2)).toBe(expected);
    });
    /*
        When testing hot observables you can specify the subscription
        point using a caret ^, similar to how you specify subscriptions
        when utilizing the expectSubscriptions assertion.
    */
    it('should work with hot observables', () => {
        const obs1 = hot('---a--^-b-|');
        const obs2 = hot('-----c^----d-|')
        const expected =       '--b--d-|';

        expectObservable(obs1.concat(obs2)).toBe(expected);
    });
    /*
        For certain operators you may want to confirm the point at which
        an observable is subscribed or unsubscribed. Marble testing makes this 
        possible by using the expectSubscriptions helper method. The cold and hot
        methods return a subscriptions object, including the frame at which the observable 
        would be subscribed and unsubscribed. You can then assert against these
        subscription points by supplying a diagram which indicates the expected behavior.

        ^ - Indicated the subscription point.
        ! - Indicates the point at which the observable was unsubscribed.

        Example subscriptions object: {"subscribedFrame":70,"unsubscribedFrame":140}
    */
    it('should identify subscription points', () => {
        const obs1 = cold('-a---b-|');
        const obs2 = cold('-c---d-|')
        const expected =  '-a---b--c---d-|';
        const sub1 =      '^------!'
        const sub2 =      '-------^------!'

        expectObservable(obs1.concat(obs2)).toBe(expected);
        expectSubscriptions(obs1.subscriptions).toBe(sub1);
        expectSubscriptions(obs2.subscriptions).toBe(sub2);
    })
    /*
        Both the hot and cold methods, as well the the toBe method accept an object map as a
        second parameter, indicating the values to output for the appropriate placeholder.
        When the test is executed these values rather than the matching string in the marble diagram.
    */
    it('should correctly sub in values', () => {
        const values = {a: 1, b: 2};
        const source = cold(  '---a---b---|', values);
        const expected =      '---a---b---|';

        expectObservable(source).toBe(expected, values);
    });
    /*
        Multiple emissions occuring in same time frame can be represented by grouping in parenthesis.
        Complete and error symbols can also be included in the same grouping as simulated outputs.
    */
    it('should handle emissions in same time frame', () => {
        const obs1 = Observable.of(1,2,3);
        const expected = '(abc|)';

        expectObservable(obs1).toBe(expected, {a: 1, b: 2, c: 3});
    });
    /*
        For asynchronous tests RxJS supplies a TestScheduler.
        How it works...
    */
    it('should work with asynchronous operators', () => {
        const obs1 = Observable
            .interval(10, rxTestScheduler)
            .take(5)
            .filter(v => v % 2 === 0);
        const expected = '-a-b-(c|)';

        expectObservable(obs1).toBe(expected, {a: 0, b: 2, c: 4});
    });
    /*
        Observables that encounter errors are represented by the pound (#) sign.
        In this case, our observable is retried twice before ultimately emitting an error.
        A third value can be supplied to the toBe method specifying the error to be matched.
    */
    it('should handle errors', () => {
        const source = Observable.of(1,2,3)
            .map(val => {
                if(val > 2){
                    throw 'Number too high!';
                };
                return val;
            })
            .retry(2);

        const expected = '(ababab#)';

        expectObservable(source).toBe(expected, {a: 1, b: 2, c: 3}, 'Number too high!');
    });   
});
