import {
  AnyAction,
  Dispatch,
  Middleware,
  MiddlewareAPI,
  PayloadAction,
} from "@reduxjs/toolkit";
import { finalize, Subject, tap } from "rxjs";
import {
  ActionPipelinePayload,
  createMiddleware,
  EffectsHandler,
  ofType,
} from "../lib";

type PipelinePayload = ActionPipelinePayload<PayloadAction<unknown>>;

const beforePipeline = new Subject<ActionPipelinePayload>();
const afterPipeline = new Subject<ActionPipelinePayload>();
jest.doMock("../lib/pipeline", () => {
  return {
    createBeforeDispatchPipeline: () => beforePipeline,
    createAfterDispatchPipeline: () => afterPipeline,
  };
});

describe("react-simple-side-effects", () => {
  describe("ofType", () => {
    it("should filter by single action type", (done) => {
      const pipeline$ = new Subject<PipelinePayload>();
      let passes = 0;
      pipeline$
        .pipe(
          ofType<PayloadAction<unknown>>("someAction"),
          tap(() => passes++),
          finalize(() => {
            expect(passes).toBe(1);
            done();
          })
        )
        .subscribe();

      next(pipeline$, "someAction");
      next(pipeline$, "anotherAction");
      next(pipeline$, "yetAnotherAction");
      pipeline$.complete();
    });

    it("should filter by multiple action types", (done) => {
      const pipeline$ = new Subject<PipelinePayload>();
      let passes = 0;
      pipeline$
        .pipe(
          ofType<PayloadAction<unknown>>(["someAction", "anotherAction"]),
          tap(() => passes++),
          finalize(() => {
            expect(passes).toBe(2);
            done();
          })
        )
        .subscribe();

      next(pipeline$, "someAction");
      next(pipeline$, "anotherAction");
      next(pipeline$, "yetAnotherAction");
      pipeline$.complete();
    });
  });

  describe("createMiddleware", () => {
    it("should create the middleware", () => {
      expect(createMiddleware(() => {})).toBeDefined();
    });

    it("should execute an effect", (done) => {
      const effects: EffectsHandler = ({ afterDispatch }) => {
        afterDispatch("someAction", () => {
          expect(true).toBeTruthy();
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
    });
  });
});

function next(pipeline$: Subject<any>, actionType: string) {
  pipeline$.next({
    action: { type: actionType },
  } as PipelinePayload);
}

function dispatchAction(
  middleware: Middleware<unknown, unknown, Dispatch<AnyAction>>,
  actionType: string
) {
  const store = {
    getState: () => {},
  } as MiddlewareAPI<Dispatch<AnyAction>, unknown>;
  middleware(store)((() => {}) as any)({ type: actionType });
}
