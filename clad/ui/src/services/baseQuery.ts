// import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
// import type {
//   BaseQueryFn,
//   FetchArgs,
//   FetchBaseQueryError,
// } from '@reduxjs/toolkit/query/react'
// import axios from 'axios'
// import type { AxiosRequestConfig, AxiosError } from 'axios'

// import type { Post } from './types'
// import { selectProjectId } from './projectSlice'

// import type { RootState } from '@/store'

// const rawBaseQuery = fetchBaseQuery({
//   baseUrl: 'www.my-cool-site.com/',
// })

// // https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#axios-basequery
// // https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#constructing-a-dynamic-base-url-using-redux-state

// type AxiosBaseQueryParams = {
//   baseUrl?: string,
// }

// function axiosBaseQuery(pParams: AxiosBaseQueryParams): BaseQueryFn<
//   {
//     url: string
//     method: AxiosRequestConfig['method']
//     data?: AxiosRequestConfig['data']
//     params?: AxiosRequestConfig['params']
//   },
//   unknown,
//   unknown
// > {
//   return async ({ url, method, data, params }) => {
//     const baseUrl = pParams.baseUrl || ''
//     try {
//       const result = await axios({ url: baseUrl + url, method, data, params })
//       return { data: result.data }
//     } catch (axiosError) {
//       let err = axiosError as AxiosError
//       return {
//         error: {
//           status: err.response?.status,
//           data: err.response?.data || err.message,
//         },
//       }
//     }
//   }
// }

// async function dynamicBaseQuery(args, api, extraOptions): Promise<BaseQueryFn<
// string | FetchArgs,
// unknown,
// FetchBaseQueryError
// >> {
//   const projectId = selectProjectId(api.getState() as RootState)
//   // gracefully handle scenarios where data to generate the URL is missing
//   if (!projectId) {
//     return {
//       error: {
//         status: 400,
//         statusText: 'Bad Request',
//         data: 'No project ID received',
//       },
//     }
//   }

//   const urlEnd = typeof args === 'string' ? args : args.url
//   // construct a dynamically generated portion of the url
//   const adjustedUrl = `project/${projectId}/${urlEnd}`
//   const adjustedArgs =
//     typeof args === 'string' ? adjustedUrl : { ...args, url: adjustedUrl }
//   // provide the amended url and other params to the raw base query
//   return rawBaseQuery(adjustedArgs, api, extraOptions)
// }

// export const api = createApi({
//   baseQuery: dynamicBaseQuery,
//   endpoints: (builder) => ({
//     getPosts: builder.query<Post[], void>({
//       query: () => 'posts',
//     }),
//   }),
// })

// const api = createApi({
//   baseQuery: axiosBaseQuery({
//     baseUrl: 'https://example.com',
//   }),
//   endpoints(build) {
//     return {
//       query: build.query({ query: () => ({ url: '/query', method: 'get' }) }),
//       mutation: build.mutation({
//         query: () => ({ url: '/mutation', method: 'post' }),
//       }),
//     }
//   },
// })