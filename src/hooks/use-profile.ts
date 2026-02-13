
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProfile() {
    const { data, error, isLoading } = useSWR("/api/users/me", fetcher);

    return {
        profile: data,
        isLoading,
        isError: error
    };
}
