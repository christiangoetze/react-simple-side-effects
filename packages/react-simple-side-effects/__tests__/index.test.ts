import {
  AnyAction,
  Dispatch,
  Middleware,
  MiddlewareAPI,
} from "@reduxjs/toolkit";
import { Subject } from "rxjs";
import {
  ActionPipelinePayload,
  createMiddleware,
  EffectsHandler,
} from "../lib";

const beforePipeline = new Subject<ActionPipelinePayload>();
const afterPipeline = new Subject<ActionPipelinePayload>();
jest.doMock("../lib/pipeline", () => {
  return {
    createBeforeDispatchPipeline: () => beforePipeline,
    createAfterDispatchPipeline: () => afterPipeline,
  };
});

describe("react-simple-side-effects", () => {
  describe("createMiddleware", () => {
    it("should create the middleware", () => {
      expect(createMiddleware(() => {})).toBeDefined();
    });
  });

  describe("beforeDispatch", () => {
    it("should execute an effect", (done) => {
      const effects: EffectsHandler = ({ beforeDispatch }) => {
        beforeDispatch("someAction", () => {
          expect(true).toBeTruthy();
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
    });

    it("should filter by single action type", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({
        beforeDispatch,
        afterDispatch,
        onDestroy,
      }) => {
        beforeDispatch("someAction", () => {
          passes++;
        });
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(1);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });

    it("should filter by multiple action types", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({
        beforeDispatch,
        afterDispatch,
        onDestroy,
      }) => {
        beforeDispatch(
          ["someAction", "anotherAction", "yetAnotherAction"],
          () => {
            passes++;
          }
        );
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(3);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });

    it("should execute on each action if empty type is provided", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({
        beforeDispatch,
        afterDispatch,
        onDestroy,
      }) => {
        beforeDispatch("", () => {
          passes++;
        });
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(3);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });
  });

  describe("afterDispatch", () => {
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

    it("should filter by single action type", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({ afterDispatch, onDestroy }) => {
        afterDispatch("someAction", () => {
          passes++;
        });
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(1);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });

    it("should filter by multiple action types", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({ afterDispatch, onDestroy }) => {
        afterDispatch(["someAction", "anotherAction"], () => {
          passes++;
        });
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(2);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });

    it("should execute on each action if empty type is provided", (done) => {
      let passes = 0;
      const effects: EffectsHandler = ({ afterDispatch, onDestroy }) => {
        afterDispatch("", () => {
          passes++;
        });
        afterDispatch("yetAnotherAction", ({ destroyMiddleware }) => {
          destroyMiddleware();
        });
        onDestroy(() => {
          expect(passes).toBe(3);
          done();
        });
      };
      const middleware = createMiddleware(effects);

      dispatchAction(middleware, "someAction");
      dispatchAction(middleware, "anotherAction");
      dispatchAction(middleware, "yetAnotherAction");
    });
  });
});

function dispatchAction(
  middleware: Middleware<unknown, unknown, Dispatch<AnyAction>>,
  actionType: string
) {
  const store = {
    getState: () => {},
  } as MiddlewareAPI<Dispatch<AnyAction>, unknown>;
  middleware(store)((() => {}) as any)({ type: actionType });
}
