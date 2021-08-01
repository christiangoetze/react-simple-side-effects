import { Dispatch, Middleware, PayloadAction } from "@reduxjs/toolkit";
import { Observable, tap, filter, map, Subscription } from "rxjs";
import {
  createAfterDispatchPipeline,
  createBeforeDispatchPipeline,
} from "./pipeline";

export interface ActionPipelinePayload<Action = unknown, AppState = unknown> {
  action: Action;
  oldState: AppState;
  newState?: AppState;
  dispatch: Dispatch<PayloadAction<unknown>>;
}

export type DispatchHandler = <
  T extends {
    payload: unknown;
    type: string;
  },
  AppState = unknown
>(
  actionType: string | string[],
  effect: (event: ActionPipelinePayload<T, AppState>) => unknown
) => Subscription;

export type EffectsHandler = (args: {
  beforeDispatch: DispatchHandler;
  afterDispatch: DispatchHandler;
}) => unknown;

export function createMiddleware<AppState = unknown>(
  effects: EffectsHandler
): Middleware<unknown, AppState> {
  const beforeDispatchPipeline$ = createBeforeDispatchPipeline();
  const afterDispatchPipeline$ = createAfterDispatchPipeline();

  function beforeDispatch<T extends PayloadAction<unknown>, AppState = unknown>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) {
    return beforeDispatchPipeline$
      .pipe(
        // @ts-ignore
        ofType<T, AppState>(actionType),
        tap(({ action, oldState, dispatch }) =>
          effect({ action, oldState, dispatch })
        )
      )
      .subscribe();
  }
  function afterDispatch<T extends PayloadAction<unknown>, AppState = unknown>(
    actionType: string | string[],
    effect: (event: ActionPipelinePayload<T, AppState>) => unknown
  ) {
    return afterDispatchPipeline$
      .pipe(
        // @ts-ignore
        ofType<T, AppState>(actionType),
        tap(({ action, oldState, newState, dispatch }) =>
          effect({ action, oldState, newState, dispatch })
        )
      )
      .subscribe();
  }

  const middleware = (store) => (next) => (action) => {
    const oldState = store.getState();
    beforeDispatchPipeline$.next({
      action,
      oldState: store.getState(),
      dispatch: store.dispatch,
    });
    const result = next(action);
    afterDispatchPipeline$.next({
      action,
      oldState,
      newState: store.getState(),
      dispatch: store.dispatch,
    });
    return result;
  };

  effects({ beforeDispatch, afterDispatch });

  return middleware;
}

export function ofType<T extends PayloadAction<unknown>, AppState = unknown>(
  type: string | string[]
): (
  source$: Observable<ActionPipelinePayload<T, AppState>>
) => Observable<ActionPipelinePayload<T, AppState>> {
  return (source$) =>
    source$.pipe(
      filter((event: ActionPipelinePayload<T, AppState>) =>
        Array.isArray(type)
          ? type.includes(event.action.type)
          : event.action.type === type
      ),
      map((event) => event as ActionPipelinePayload<T, AppState>)
    );
}
