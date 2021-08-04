import { Dispatch, Middleware, PayloadAction } from "@reduxjs/toolkit";
import {
  Observable,
  tap,
  filter,
  map,
  Subscription,
  Subject,
  takeUntil,
} from "rxjs";
import {
  createAfterDispatchPipeline,
  createBeforeDispatchPipeline,
} from "./pipeline";

export interface ActionPipelinePayload<Action = unknown, AppState = unknown> {
  action: Action;
  oldState: AppState;
  newState?: AppState;
  dispatch: Dispatch<PayloadAction<unknown>>;
  destroyMiddleware: () => void;
}

export type EffectsHandler<AppState = unknown> = (args: {
  beforeDispatch: <T extends PayloadAction<unknown>>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) => Subscription;
  afterDispatch: <T extends PayloadAction<unknown>>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) => Subscription;
  onDestroy: (handler: () => unknown) => Subscription;
}) => unknown;

export function createMiddleware<AppState = unknown>(
  effects: EffectsHandler<AppState>
): Middleware {
  const beforeDispatchPipeline$ = createBeforeDispatchPipeline();
  const afterDispatchPipeline$ = createAfterDispatchPipeline();
  const destroy$ = new Subject();
  const subs: Subscription[] = [];

  function beforeDispatch<T extends PayloadAction<unknown>>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) {
    const sub = beforeDispatchPipeline$
      .pipe(
        // @ts-ignore
        ofType<T, AppState>(actionType),
        tap(({ action, oldState, dispatch, destroyMiddleware }) =>
          effect({ action, oldState, dispatch, destroyMiddleware })
        ),
        takeUntil(destroy$)
      )
      .subscribe();
    subs.push(sub);
    return sub;
  }
  function afterDispatch<T extends PayloadAction<unknown>>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) {
    const sub = afterDispatchPipeline$
      .pipe(
        // @ts-ignore
        ofType<T, AppState>(actionType),
        tap(({ action, oldState, newState, dispatch, destroyMiddleware }) =>
          effect({ action, oldState, newState, dispatch, destroyMiddleware })
        ),
        takeUntil(destroy$)
      )
      .subscribe();
    subs.push(sub);
    return sub;
  }

  function onDestroy(handler: () => unknown) {
    const sub = destroy$
      .pipe(
        tap(() => {
          handler();
          sub.unsubscribe();
        })
      )
      .subscribe();
    return sub;
  }

  function destroyMiddleware(): void {
    destroy$.next({});
  }

  function ofType<T extends PayloadAction<unknown>>(
    type: string | string[]
  ): (
    source$: Observable<ActionPipelinePayload<T, AppState>>
  ) => Observable<ActionPipelinePayload<T, AppState>> {
    return (source$) =>
      source$.pipe(
        filter((event: ActionPipelinePayload<T, AppState>) =>
          Array.isArray(type)
            ? type.includes(event.action.type)
            : !type || event.action.type === type
        ),
        map((event) => event as ActionPipelinePayload<T, AppState>)
      );
  }

  const middleware = (store) => (next) => (action) => {
    const oldState = store.getState();
    beforeDispatchPipeline$.next({
      action,
      oldState: store.getState(),
      dispatch: store.dispatch,
      destroyMiddleware,
    });
    const result = next(action);
    afterDispatchPipeline$.next({
      action,
      oldState,
      newState: store.getState(),
      dispatch: store.dispatch,
      destroyMiddleware,
    });
    return result;
  };

  effects({ beforeDispatch, afterDispatch, onDestroy });

  return middleware;
}
