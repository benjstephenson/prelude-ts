import { Either } from "../src/Either";
import { Vector } from "../src/Vector";
import { Seq } from "../src/Seq";
import { assertFailCompile } from "./TestHelpers";
import * as assert from 'assert'
import {Future} from "../src";

describe("either comparison", () => {
    it("should mark equal eithers as equal", () =>
       assert.ok(Either.right(5).equals(Either.right<number,number>(5))))
    it("should mark different eithers as not equal", () =>
       assert.ok(!Either.right(5).equals(Either.right<number,number>(6))))
    it("should mark left as equals to left", () =>
       assert.ok(Either.left("x").equals(Either.left<string,string>("x"))));
    it("should mark left and right as not equal", () =>
       assert.ok(!Either.right(5).equals(Either.left<number,number>(5))));
    it("should mark left and right as not equal", () =>
       assert.ok(!Either.left(5).equals(Either.right<number,number>(5))));
    it("should return true on contains", () =>
       assert.ok(Either.right(5).contains(5)));
    it("should return false on contains on left", () =>
       assert.ok(!Either.left(5).contains(5)));
    it("should return false on contains", () =>
       assert.ok(!Either.right(6).contains(5)));
    it("doesn't throw when given another type on equals", () => assert.strictEqual(
        false, Either.right(1).equals(<any>[1,2])));
    it("doesn't throw when given null on equals", () => assert.strictEqual(
        false, Either.right(1).equals(<any>null)));
    it("empty doesn't throw when given another type on equals", () => assert.strictEqual(
        false, Either.left(1).equals(<any>[1,2])));
    it("empty doesn't throw when given null on equals", () => assert.strictEqual(
        false, Either.left(1).equals(<any>null)));
    it("should throw when comparing eithers without true equality", () => assert.throws(
        () => Either.right(Vector.of([1])).equals(
            Either.right<string,Vector<number[]>>(Vector.of([1])))));
    it("should fail compilation on an obviously bad equality test", () =>
       assertFailCompile(
           "Either.right([1]).equals(Either.right([1]))", "is not assignable to parameter"));
    it("should fail compilation on an obviously bad contains test", () =>
       assertFailCompile(
           "Either.right([1]).contains([1])",
           "is not assignable to parameter"));
});

describe("either transformation", () => {
    it("should transform with map", () => {
        assert.ok(Either.right(5).equals(Either.right<number,number>(4).map(x=>x+1)));
    });
    it("should transform with map returning a future", async () => {
       assert.ok(Either.right(2).equals(
           await Either.right<number, number>(1).mapF(x => Future.ok(x + 1)).toPromise()
       ))
    });
    it("should preserve the left when transforming with a map returning a future", async () =>
      assert.ok(Either.left(1).equals(
          await Either.left<number, number>(1).mapF(x => Future.ok(x + 1)).toPromise()
      ))
    )
    it("should transform with mapLeft returning a future", async () => {
        assert.ok(Either.left(2).equals(
            await Either.left<number, number>(1).mapLeftF(x => Future.ok(x + 1)).toPromise()
        ))
    });
    it("should preserve the right when transforming with a mapLeft returning a future", async () =>
        assert.ok(Either.right(1).equals(
            await Either.right<number, number>(1).mapLeftF(x => Future.ok(x + 1)).toPromise()
        ))
    )
    it("should handle null as Right", () =>
       assert.ok(Either.right(5).map<number|null>(x => null).equals(
           Either.right<string,number|null>(null))));
    it("should transform a Right to string properly", () =>
       assert.strictEqual("Right(5)", Either.right(5).toString()));
    it("should transform a Left to string properly", () =>
       assert.strictEqual("Left(5)", Either.left(5).toString()));
    it("should transform with flatMap x->y", () => {
        assert.ok(Either.right(5).equals(
            Either.right<number,number>(4)
                .flatMap(x=>Either.right<number,number>(x+1))));
    });
    it("should transform with flatMap x->left", () => {
        assert.ok(Either.left<number,number>(5).equals(
            Either.right<number,number>(4).flatMap(x=>Either.left<number,number>(5))));
    });
    it("should transform with flatMap left->left", () => {
        assert.ok(Either.left(4).equals(
            Either.left<number,number>(4).flatMap(x=>Either.right<number,number>(x+1))));
    });
    it("should apply bimap on the left value", () =>
       assert.ok(Either.left<number,number>(4).equals(
           Either.left<number,number>(3).bimap(x=>x+1,x=>x-1))));
    it("should apply bimap on the right value", () =>
       assert.ok(Either.right<number,number>(2).equals(
           Either.right<number,number>(3).bimap(x=>x+1,x=>x-1))));
    it("should apply match to a right", () =>
       assert.strictEqual(5, Either.right<number,number>(4).match({
           Right: x=>x+1,
           Left:  x=>-1
       })));
    it("should apply match to a left", () =>
       assert.strictEqual(4, Either.left<number,number>(5).match({
           Right: x=>1,
           Left:  x=>x-1
       })));
    it("should liftA2", () => assert.ok(Either.right<string,number>(11).equals(
        Either.liftA2((x:number,y:number) => x+y, {} as string)
        (Either.right<string,number>(5), Either.right<string,number>(6)))));
    it("should abort liftA2 on left", () => assert.ok(Either.left("bad").equals(
        Either.liftA2((x:number,y:number) => x+y, {} as string)(
            Either.right<string,number>(5), Either.left<string,number>("bad")))));
    it("should liftAp", () => {
        const fn = (x:{a:number,b:number,c:number}) => x.a+x.b+x.c;
        const lifted = Either.liftAp(fn, {} as number);
        assert.ok(Either.right(14).equals(
            lifted({a:Either.right<number,number>(5), b:Either.right<number,number>(6), c:Either.right<number,number>(3)})));
    });
    it("should abort liftAp on left", () => assert.ok(Either.left(2).equals(
        Either.liftAp<number,{a:number,b:number},number>(x => x.a+x.b)
        ({a:Either.right<number,number>(5), b:Either.left<number,number>(2)}))));
    it("should lift 5-parameter functions", () => {
        assert.ok(Either.lift(
            (x:number,y:number,z:number,a:number,b:number)=>x+1)(1,2,3,4,5).equals(Either.right(2)));
        assert.throws(()=>Either.lift(
            (x:number,y:number,z:number,a:number,b:number)=>undefined)(1,2,3,4,5));
        assert.ok(Either.lift(
            (x:number,y:number,z:number,a:number,b:number)=>{throw "x"})(1,2,3,4,5).isLeft());
    });
    it("left should provide transform", () => assert.strictEqual(
        6, Either.left<number,number>(5).transform(x => 6)));
    it("right should provide transform", () => assert.strictEqual(
        6, Either.right<number,number>(5).transform(x => 6)));
    it("should return the unchanged either if it was a left on filter", () => assert.ok(
        Either.left("bad").equals(
            Either.left<string,number>("bad").filter(x => x<0, v => ""))));
    it("should return the unchanged either if it was a right and predicate passes on filter", () => assert.ok(
        Either.right<string, number>(5).equals(
            Either.right<string, number>(5).filter(x => x>0, v => ""))));
    it("should return the unchanged successful either on recoverWith", () => assert.ok(
        Either.right<number, number>(6).equals(
            Either.right<number, number>(6).recoverWith(v => Either.right<number, number>(v+1)))
    ));
    it("should return the new either on a failed Either with recoverWith", () => assert.ok(
        Either.right<number, number>(7).equals(
            Either.left<number, number>(6).recoverWith(v => Either.right<number, number>(v+1)))
    ));
    it("should return the new failed either on a failed Either with recoverWith", () => assert.ok(
        Either.left<number, number>(7).equals(
            Either.left<number, number>(6).recoverWith(v => Either.left<number, number>(v+1)))
    ));
});

describe("Either helpers", () => {
    it("should do sequence when all are right", () =>
       assert.ok(
           Either.right(<Seq<number>>Vector.of(1,2,3)).equals(
               Either.sequence(Vector.of(Either.right<number,number>(1),
                                         Either.right<number,number>(2),
                                         Either.right<number,number>(3))))));
    it("should fail sequence when some are left", () =>
       assert.ok(
           Either.left(2).equals(
               Either.sequence(Vector.of(Either.right<number,number>(1),
                                         Either.left<number,number>(2),
                                         Either.left<number,number>(3))))));

    it("should flatten nested rights", () =>
       assert.ok(
           Either.right(2).equals(
               Either.flatten(Either.right<number, Either<number, number>>(Either.right<number, number>(2)))
           )
       )
    )

    it("should preserve a left when flattening", () =>
      assert.ok(
          Either.left(2).equals(
              Either.flatten(Either.left<number, Either<number, number>>(2))
          )
      )
    )

    it("should flatten nested lefts", () =>
        assert.ok(
            Either.left(2).equals(
                Either.flattenLeft(Either.left<Either<number, number>, number>(Either.left<number, number>(2)))
            )
        )
    )

    it("should preserve a left when flattening", () =>
        assert.ok(
            Either.right(2).equals(
                Either.flattenLeft(Either.right<Either<number, number>, number>(2))
            )
        )
    )
});


describe("either retrieval", () => {
    it("should return the value on Right.getOrElse", () =>
       assert.strictEqual(5, Either.right(5).getOrElse(6)));
    it("should return the alternative on Left.getOrElse", () =>
       assert.strictEqual(6, Either.left<number,number>(5).getOrElse(6)));
    it("should return the value on Right.toVector", () =>
       assert.deepStrictEqual([5], Either.right(5).toVector().toArray()));
    it("should return empty on Left.toVector", () =>
       assert.deepStrictEqual([], Either.left<number,number>(5).toVector().toArray()));
    it("should not throw on Right.getOrThrow", () =>
       assert.strictEqual(5, Either.right(5).getOrThrow()));
    it("should throw on Left.getOrThrow", () =>
       assert.throws(() => Either.left<number,number>(5).getOrThrow()));
    it("should throw on Left.getOrThrow with custom msg", () =>
       assert.throws(() => Either.left<number,number>(5).getOrThrow("my custom msg"),
                     (err:any) => err.message === 'my custom msg'));
    it("should offer get() if i checked for isRight", () => {
        const either = <Either<string,number>>Either.right(5);
        if (either.isRight()) {
            // what we are checking here is whether this does build
            // .get() is available only on Right
            assert.strictEqual(5, either.get());
        }
    });
    it("should offer get() if i checked against isLeft", () => {
        const either = <Either<string,number>>Either.right(5);
        if (!either.isLeft()) {
            // what we are checking here is whether this does build
            // .get() is available only on Right
            assert.strictEqual(5, either.get());
        }
    });
    it("should offer getLeft() if i checked for isLeft", () => {
        const either = <Either<string,number>>Either.left("5");
        if (either.isLeft()) {
            // what we are checking here is whether this does build
            // .get() is available only on Left
            assert.strictEqual("5", either.getLeft());
        }
    });
    it("should offer getLeft() if i checked against isRight", () => {
        const either = <Either<string,number>>Either.left("5");
        if (!either.isRight()) {
            // what we are checking here is whether this does build
            // .get() is available only on Left
            assert.strictEqual("5", either.getLeft());
        }
    });
});
